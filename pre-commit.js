import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import asyncFs from 'node:fs/promises'

const execAsync = promisify(exec)

const folders = ['api', 'backend', 'frontend', 'mobile']

const containerMap = {
  api: 'bc-dev-api',
  backend: 'bc-dev-backend',
  frontend: 'bc-dev-frontend',
  mobile: null, // Mobile does not have a container
}

const dockerComposeFile = 'docker-compose.dev.yml'

function fixMessage(message) {
  const isVSCodeTerminal = process.env.TERM_PROGRAM?.includes('vscode')
  if (isVSCodeTerminal) {
    message = message.replace(/(ℹ️|⚠️)/g, '$1 ')
  }
  return message
}

function formatMessage(folder, message) {
  return `[${folder}] ${message}`
}

function log(message) {
  console.log(fixMessage(message))
}

function logFolder(folder, message) {
  log(formatMessage(folder, message))
}

function logError(message, ...args) {
  console.error(fixMessage(message), ...args)
}

function logFolderError(folder, message, ...args) {
  logError(formatMessage(folder, message), ...args)
}

async function isInsideDocker() {
  try {
    const cgroup = await asyncFs.readFile('/proc/1/cgroup', 'utf8')
    return cgroup.includes('docker') || cgroup.includes('containerd')
  } catch {
    return false
  }
}

async function isDockerRunning() {
  try {
    await execAsync('docker info')
    return true
  } catch {
    return false
  }
}

async function isContainerRunning(containerName) {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=${containerName}" --filter "status=running" --format "{{.Names}}"`,
    )
    return stdout.trim().includes(containerName)
  } catch {
    return false
  }
}

async function getChangedFiles() {
  try {
    const { stdout } = await execAsync('git diff --cached --name-only')
    return stdout.trim().split('\n').filter(Boolean)
  } catch (err) {
    logError('❌ Failed to get changed files:', err)
    return []
  }
}

function groupFilesByFolder(files) {
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

async function run(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, options)
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

async function runInContext(folder, cmd, runInDocker) {
  const container = containerMap[folder]
  if (runInDocker && container) {
    const dockerCmd = `docker compose -f ${dockerComposeFile} exec -T ${container} sh -c "cd /bookcars/${folder} && ${cmd}"`
    return run(dockerCmd, { cwd: process.cwd() })
  }
  return run(cmd, { cwd: folder })
}

async function lint(folder, files, runInDocker) {
  if (files.length === 0) {
    return
  }

  logFolder(folder, `🔍 Running ESLint on ${files.length} file(s)...`)

  // Filter files to include only TypeScript and JavaScript files (.ts, .tsx, .js, .jsx)
  const targets = files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))

  if (targets.length === 0) {
    logFolder(folder, `ℹ️ No lintable files.`)
    return
  }

  try {
    await runInContext(folder, `npx eslint ${targets.join(' ')} --cache --cache-location .eslintcache`, runInDocker)
    logFolder(folder, `✅ ESLint passed.`)
  } catch (err) {
    logFolderError(folder, `❌ ESLint failed.`)
    throw err
  }
}

async function typeCheck(folder, files, runInDocker) {
  if (files.length === 0) {
    return
  }

  logFolder(folder, `🔍 Running TypeScript check...`)

  // Filter files to include only TypeScript files (.ts, .tsx)
  const targets = files.filter((file) => /\.(ts|tsx)$/.test(file))

  if (targets.length === 0) {
    logFolder(folder, `ℹ️ No TypeScript files to check.`)
    return
  }

  try {
    await runInContext(folder, `npm run type-check`, runInDocker)
    logFolder(folder, `✅ TypeScript check passed.`)
  } catch (err) {
    logFolderError(folder, `❌ TypeScript check failed.`)
    throw err
  }
}

(async function () {
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
      const containersNeeded = Object.values(containerMap).filter(Boolean)
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

      // Run lint and type-check in parallel per folder
      tasks.push(
        Promise.all([
          lint(folder, files, runInDocker),
          typeCheck(folder, files, runInDocker),
        ])
      )
    }

    // Wait for all tasks to complete, and if any fails, it will throw an error
    await Promise.all(tasks)

    log('\n✅ All checks passed. Proceeding with commit.')
    console.timeEnd(label)
    process.exit(0)
  } catch (err) {
    logError('\n🚫 Commit aborted due to pre-commit errors.')
    console.timeEnd(label)
    process.exit(1)
  }
}())

