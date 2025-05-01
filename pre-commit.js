import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs'
import asyncFs from 'node:fs/promises'
import chalk from 'chalk'

const execAsync = promisify(exec)

const folders = ['api', 'backend', 'frontend', 'mobile']

const containers = {
  api: 'bc-dev-api',
  backend: 'bc-dev-backend',
  frontend: 'bc-dev-frontend',
  mobile: null, // Mobile does not have a container
}

const dockerComposeFile = 'docker-compose.dev.yml'

const config = {
  maxFileSizeKB: 5 * 1024, // 5MB file size limit
  lintFilter: /\.(ts|tsx|js|jsx)$/, // Lint only TypeScript and JavaScript files (.ts, .tsx, .js, .jsx)
  typeCheckFilter: /\.(ts|tsx)$/, // Type-check only TypeScript files (.ts, .tsx)
}

const fixMessage = (message) => {
  const isVSCodeTerminal = process.env.TERM_PROGRAM?.includes('vscode')
  if (isVSCodeTerminal) {
    message = message.replace(/(ℹ️|⚠️)/g, '$1 ')
  }
  return message
}

const formatMessage = (folder, message) => {
  return `[${chalk.cyan(folder)}] ${message}`
}

const log = (message) => {
  console.log(fixMessage(message))
}

const logFolder = (folder, message) => {
  log(formatMessage(folder, message))
}

const logError = (message, ...args) => {
  console.error(chalk.red(fixMessage(message)), ...args)
}

const logFolderError = (folder, message, ...args) => {
  logError(formatMessage(folder, message), ...args)
}

const isInsideDocker = async () => {
  try {
    const cgroup = await asyncFs.readFile('/proc/1/cgroup', 'utf8')
    return cgroup.includes('docker') || cgroup.includes('containerd')
  } catch {
    return false
  }
}

const isDockerRunning = async () => {
  try {
    await execAsync('docker info')
    return true
  } catch {
    return false
  }
}

const isContainerRunning = async (containerName) => {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=${containerName}" --filter "status=running" --format "{{.Names}}"`,
    )
    return stdout.trim().includes(containerName)
  } catch {
    return false
  }
}

const getChangedFiles = async () => {
  try {
    const { stdout } = await execAsync('git diff --cached --name-only')
    return stdout.trim().split('\n').filter(Boolean)
  } catch (err) {
    logError('❌ Failed to get changed files:', err)
    return []
  }
}

const groupFilesByFolder = (files) => {
  const projectFiles = Object.fromEntries(folders.map((folder) => [folder, []]))
  const folderSet = new Set(folders) // create a quick lookup

  for (const file of files) {
    const [folder, ...rest] = file.split('/')
    if (folderSet.has(folder)) {
      projectFiles[folder].push(rest.join('/'))
    }
  }

  return projectFiles
}

const run = async (command, options = {}) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      ...options,
      maxBuffer: 10 * 1024 * 1024  // Increase buffer to 10MB
    })

    if (stdout) {
      process.stdout.write(stdout)
    }
    if (stderr) {
      process.stderr.write(stderr)
    }
  } catch (err) {
    if (err.stdout) {
      process.stdout.write(err.stdout)
    }
    if (err.stderr) {
      process.stderr.write(err.stderr)
    }
    throw err
  }
}

const runInContext = async (folder, cmd, runInDocker) => {
  const container = containers[folder]
  if (runInDocker && container) {
    const dockerCmd = `docker compose -f ${dockerComposeFile} exec -T ${container} sh -c "cd /bookcars/${folder} && ${cmd}"`
    return run(dockerCmd, { cwd: process.cwd() })
  }
  return run(cmd, { cwd: folder })
}

const lint = async (folder, files, runInDocker) => {
  if (files.length === 0) {
    return
  }

  logFolder(folder, `🔍 Running ESLint on ${files.length} file(s)...`)

  const targets = files.filter((file) => config.lintFilter.test(file))

  if (targets.length === 0) {
    logFolder(folder, `ℹ️ No lintable files.`)
    return
  }

  try {
    await runInContext(folder, `npx eslint ${targets.join(' ')} --cache --cache-location .eslintcache`, runInDocker)
    logFolder(folder, `${chalk.green('✅ ESLint passed.')}`)
  } catch (err) {
    logFolderError(folder, `❌ ESLint failed.`)
    throw err
  }
}

const typeCheck = async (folder, files, runInDocker) => {
  if (files.length === 0) {
    return
  }

  logFolder(folder, `🔍 Running TypeScript check...`)

  const targets = files.filter((file) => config.typeCheckFilter.test(file))

  if (targets.length === 0) {
    logFolder(folder, `ℹ️ No TypeScript files to check.`)
    return
  }

  try {
    await runInContext(folder, `npm run type-check`, runInDocker)
    logFolder(folder, `${chalk.green('✅ TypeScript check passed.')}`)
  } catch (err) {
    logFolderError(folder, `❌ TypeScript check failed.`)
    throw err
  }
}

const getFileStats = async (filePath) => {
  try {
    const stats = await asyncFs.stat(filePath)
    return stats
  } catch (err) {
    return null
  }
}

const checkFileSize = async (folder, files) => {
  if (files.length === 0) {
    return
  }

  logFolder(folder, `📏 Checking file sizes...`)

  const oversizedFiles = []
  const checkPromises = files.map(async (file) => {
    const filePath = path.join(folder, file)
    const stats = await getFileStats(filePath)

    if (stats) {
      const sizeKB = stats.size / 1024
      if (sizeKB > config.maxFileSizeKB) {
        oversizedFiles.push({ file, sizeKB: sizeKB.toFixed(2) })
      }
    }
  })

  await Promise.all(checkPromises)

  if (oversizedFiles.length > 0) {
    logFolderError(folder, `❌ Found ${oversizedFiles.length} files exceeding size limit (${config.maxFileSizeKB}KB):`)
    for (const { file, sizeKB } of oversizedFiles) {
      logFolderError(folder, `  - ${file} (${sizeKB}KB)`)
    }
    throw new Error(`Oversized files detected in ${folder}`)
  }

  logFolder(folder, `${chalk.green('✅ All files are within size limits.')}`)
}

const main = async () => {
  const label = 'pre-commit'
  console.time(label)
  log('🚀 Starting pre-commit checks...')

  try {
    const insideDocker = await isInsideDocker()
    const dockerRunning = await isDockerRunning()

    let runInDocker = false

    if (insideDocker) {
      log('🐳 Inside Docker environment. Running checks locally...')
    } else if (dockerRunning) {
      const containersNeeded = Object.values(containers).filter(Boolean)
      const runningContainers = await Promise.all(containersNeeded.map(isContainerRunning))
      runInDocker = runningContainers.every(Boolean)

      if (runInDocker) {
        log('🐳 Docker and containers are running. Running checks inside Docker...')
      } else {
        log('⚠️ Docker is running, but some containers are not. Running checks locally...')
      }
    } else {
      log('⚠️ Docker is not running. Running checks locally...')
    }

    const changedFiles = await getChangedFiles()
    const projectFiles = groupFilesByFolder(changedFiles)

    const tasks = []

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        log(`⚠️ Skipping missing folder: ${folder}`)
        continue
      }

      const files = projectFiles[folder]

      if (files.length === 0) {
        logFolder(folder, 'ℹ️ No changed files. Skipping.')
        continue
      }

      // Run checks in parallel per folder
      tasks.push(
        Promise.all([
          lint(folder, files, runInDocker),
          typeCheck(folder, files, runInDocker),
          checkFileSize(folder, files),
        ])
      )
    }

    // Wait for all tasks to complete, and if any fails, it will throw an error
    await Promise.all(tasks)

    log(`\n${chalk.green('✅ All checks passed. Proceeding with commit.')}`)
    console.timeEnd(label)
    process.exit(0)
  } catch (err) {
    logError('\n🚫 Commit aborted due to pre-commit errors.')
    console.timeEnd(label)
    process.exit(1)
  }
}

main() // Run pre-commit checks
