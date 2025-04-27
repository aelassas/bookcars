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
  // Check if we're running inside VSCode's integrated terminal
  const isVSCodeTerminal = process.env.TERM_PROGRAM?.includes('vscode')

  // If we are in VSCode terminal, add one space after ℹ️ and ⚠️ emojis
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
  error(formatMessage(folder, message), ...args)
}

const label = 'pre-commit'
console.time(label)
log('🚀 Starting pre-commit checks...')

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
      `docker ps --filter "name=${containerName}" --filter "status=running" --format "{{.Names}}"`
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

  for (const file of files) {
    for (const folder of folders) {
      if (file.startsWith(`${folder}/`)) {
        const relativePath = file.substring(folder.length + 1)
        projectFiles[folder].push(relativePath)
        break
      }
    }
  }

  return projectFiles
}

async function runCommand(command, cwd) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd })
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
  } catch (err) {
    if (err.stdout) process.stdout.write(err.stdout)
    if (err.stderr) process.stderr.write(err.stderr)
    throw err
  }
}

async function runLintStep(folder, files, runInDocker) {
  if (files.length === 0) return

  logFolder(folder, `🔍 Running ESLint on ${files.length} file(s)...`)

  // Filter files to include only TypeScript and JavaScript files (.ts, .tsx, .js, .jsx)
  const lintTargets = files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))

  if (lintTargets.length === 0) {
    logFolder(folder, `ℹ️ No lintable files.`)
    return
  }

  const container = containerMap[folder]

  try {
    if (runInDocker && container) {
      await runCommand(
        `docker compose -f ${dockerComposeFile} exec -T ${container} sh -c "cd /bookcars/${folder} && npx eslint ${lintTargets.join(' ')} --cache --cache-location .eslintcache"`,
        process.cwd()
      )
    } else {
      await runCommand(
        `npx eslint ${lintTargets.join(' ')} --cache --cache-location .eslintcache`,
        folder
      )
    }
    logFolder(folder, `✅ ESLint passed.`)
  } catch (err) {
    logFolderError(folder, `❌ ESLint failed.`)
    throw err
  }
}

async function runTypeCheckStep(folder, runInDocker) {
  logFolder(folder, `🔍 Running TypeScript check...`)

  const container = containerMap[folder]

  try {
    if (runInDocker && container) {
      await runCommand(
        `docker compose -f ${dockerComposeFile} exec -T ${container} sh -c "cd /bookcars/${folder} && npm run type-check"`,
        process.cwd()
      )
    } else {
      await runCommand('npm run type-check', folder)
    }
    logFolder(folder, `✅ TypeScript check passed.`)
  } catch (err) {
    logFolderError(folder, `❌ TypeScript check failed.`)
    throw err
  }
}

(async () => {
  try {
    const insideDocker = await isInsideDocker()
    const dockerRunning = await isDockerRunning()

    let runInDocker = false

    if (insideDocker) {
      log('🐳 Inside Docker environment. Running checks locally...')
    } else if (dockerRunning) {
      const containersNeeded = Object.values(containerMap).filter(Boolean)
      const runningContainers = await Promise.all(
        containersNeeded.map(isContainerRunning)
      )
      const allContainersRunning = runningContainers.every(Boolean)

      if (allContainersRunning) {
        log('🐳 Docker and containers are running. Running checks inside Docker...')
        runInDocker = true
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

      if (files.length > 0) {
        tasks.push(runLintStep(folder, files, runInDocker))
        tasks.push(runTypeCheckStep(folder, runInDocker))
      } else {
        logFolder(folder, 'ℹ️ No changed files. Skipping.')
      }
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
})()
