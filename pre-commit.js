import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { constants } from 'node:fs'
import asyncFs from 'node:fs/promises'
import chalk from 'chalk'

const execAsync = promisify(exec)

const config = {
  projects: {
    api: {
      folder: 'api',
      container: 'bc-dev-api',
      checks: ['lint', 'typeCheck', 'sizeCheck'],
    },
    backend: {
      folder: 'backend',
      container: 'bc-dev-backend',
      checks: ['lint', 'typeCheck', 'sizeCheck'],
    },
    frontend: {
      folder: 'frontend',
      container: 'bc-dev-frontend',
      checks: ['lint', 'typeCheck', 'sizeCheck'],
    },
    mobile: {
      folder: 'mobile',
      container: null, // Mobile does not have a container
      checks: ['lint', 'typeCheck', 'sizeCheck'],
    },
  },
  dockerComposeFile: 'docker-compose.dev.yml',
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

const logProject = (project, message) => {
  log(formatMessage(project.folder, message))
}

const logError = (message, ...args) => {
  console.error(chalk.red(fixMessage(message)), ...args)
}

const logProjectError = (project, message, ...args) => {
  logError(formatMessage(project.folder, message), ...args)
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
  const folders = Object.values(config.projects).map((project) => project.folder)
  const projectFiles = Object.fromEntries(folders.map((folder) => [folder, []]))
  const folderSet = new Set(folders) // Create a quick lookup

  for (const file of files) {
    const [folder, ...rest] = file.split('/')
    if (folderSet.has(folder)) {
      projectFiles[folder].push(rest.join('/'))
    }
  }

  return projectFiles
}

const getChangedFilesInProject = async (project) => {
  try {
    const { folder } = project
    const { stdout } = await execAsync(`git diff --cached --name-only ${folder}/`)
    return stdout.trim().split('\n').filter(Boolean).map((file) => file.replace(`${folder}/`, ''))
  } catch (err) {
    logProjectError(project, '❌ Failed to get changed files:', err)
    return []
  }
}

const run = async (command, options = {}) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      ...options,
      maxBuffer: 10 * 1024 * 1024 // Increase buffer to 10MB
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

const escapeShellArg = (arg) => {
  return arg.replace(/(["'\\$`!])/g, '\\$1') // Escape potentially dangerous characters
}

const runInContext = async (project, cmd, runInDocker) => {
  const { folder, container } = project

  const safeFolder = escapeShellArg(folder) // Sanitize the folder to prevent directory traversal or invalid names
  const safeCmd = escapeShellArg(cmd) // Sanitize the command to prevent injection attacks

  if (runInDocker && container) {
    const dockerCmd = `docker compose -f ${config.dockerComposeFile} exec -T ${container} sh -c "cd /bookcars/${safeFolder} && ${safeCmd}"`
    return run(dockerCmd, { cwd: process.cwd() })
  }
  return run(safeCmd, { cwd: safeFolder })
}

const filterFiles = (files, regex) => {
  return files.filter((file) => regex.test(file))
}

const lint = async (project, files, runInDocker) => {
  if (files.length === 0) {
    return
  }

  logProject(project, `🔍 Running ESLint on ${files.length} file(s)...`)

  const targets = filterFiles(files, config.lintFilter)

  if (targets.length === 0) {
    logProject(project, `ℹ️ No lintable files.`)
    return
  }

  try {
    await runInContext(project, `npx eslint ${targets.join(' ')} --cache --cache-location .eslintcache`, runInDocker)
    logProject(project, `${chalk.green('✅ ESLint passed.')}`)
  } catch (err) {
    logProjectError(project, `❌ ESLint failed.`)
    throw err
  }
}

const typeCheck = async (project, files, runInDocker) => {
  if (files.length === 0) {
    return
  }

  logProject(project, `🔍 Running TypeScript check...`)

  const targets = filterFiles(files, config.typeCheckFilter)

  if (targets.length === 0) {
    logProject(project, `ℹ️ No TypeScript files to check.`)
    return
  }

  try {
    await runInContext(project, `npm run type-check`, runInDocker)
    logProject(project, `${chalk.green('✅ TypeScript check passed.')}`)
  } catch (err) {
    logProjectError(project, `❌ TypeScript check failed.`)
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

const pathExists = async (filePath) => {
  try {
    await asyncFs.access(filePath, constants.F_OK)
    return true
  } catch (err) {
    return false
  }
}

const checkFileSize = async (project, files) => {
  if (files.length === 0) {
    return
  }

  const { folder } = project

  logProject(project, `📏 Checking file sizes...`)

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
    logProjectError(project, `❌ Found ${oversizedFiles.length} files exceeding size limit (${config.maxFileSizeKB}KB):`)
    for (const { file, sizeKB } of oversizedFiles) {
      logProjectError(project, `  - ${file} (${sizeKB}KB)`)
    }
    throw new Error(`Oversized files detected in ${folder}`)
  }

  logProject(project, `${chalk.green('✅ All files are within size limits.')}`)
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
      const containersNeeded = Object.values(config.projects)
        .filter((project) => project.container)
        .map((project) => project.container)
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

    const changedfiles = await getChangedFiles()
    const projectFiles = groupFilesByFolder(changedfiles)
    const tasks = []

    for (const [projectName, project] of Object.entries(config.projects)) {
      const { folder, checks } = project

      if (!folder) {
        logProject({ folder: projectName }, '⚠️ Missing folder config. Skipping.')
        continue
      }

      if (!('container' in project)) {
        logProject(project, '⚠️ Missing container config. Skipping.')
        continue
      }

      if (!(await pathExists(folder))) {
        logProject(project,`⚠️ Folder not found. Skipping.`)
        continue
      }

      const files = projectFiles[folder]
      // const files = await getChangedFilesInProject(project) // This is slow

      if (files.length === 0) {
        logProject(project, 'ℹ️ No changed files. Skipping.')
        continue
      }

      if (!checks || checks.length === 0) {
        logProject(project, 'ℹ️ No checks configured. Skipping.')
        continue
      }

      const folderTasks = []

      if (checks.includes('lint')) {
        folderTasks.push(lint(project, files, runInDocker))
      }

      if (checks.includes('typeCheck')) {
        folderTasks.push(typeCheck(project, files, runInDocker))
      }

      if (checks.includes('sizeCheck')) {
        folderTasks.push(checkFileSize(project, files))
      }

      // Run checks in parallel per folder
      tasks.push(Promise.all(folderTasks))
    }

    // Wait for all tasks to complete, and if any fails, it will throw an error
    await Promise.all(tasks)

    log(`\n${chalk.green('✅ All checks passed. Proceeding with commit.')}`)
    console.timeEnd(label)
    process.exit(0)
  } catch (err) {
    console.error(err)
    logError('\n🚫 Commit aborted due to pre-commit errors.')
    console.timeEnd(label)
    process.exit(1)
  }
}

main() // Run pre-commit checks
