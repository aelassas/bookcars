import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import asyncFs from 'node:fs/promises'

const execAsync = promisify(exec)

const label = 'pre-commit'
console.time(label)
console.log('🚀 Starting pre-commit checks...')

const folders = ['api', 'backend', 'frontend', 'mobile']

const containerMap = {
  api: 'bc-dev-api',
  backend: 'bc-dev-backend',
  frontend: 'bc-dev-frontend',
  mobile: null, // Mobile does not have a container
}

const dockerComposeFile = 'docker-compose.dev.yml'

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

function getMessage(folder, message) {
  return `[${folder}] ${message}`
}

async function getChangedFiles() {
  try {
    const { stdout } = await execAsync('git diff --cached --name-only')
    return stdout.trim().split('\n').filter(Boolean)
  } catch (err) {
    console.error('❌ Failed to get changed files:', err)
    return []
  }
}

function groupFilesByFolder(files) {
  const projectFiles = Object.fromEntries(folders.map((f) => [f, []]))

  for (const file of files) {
    for (const folder of folders) {
      if (file.startsWith(folder + '/')) {
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

  console.log(getMessage(folder, `🔍 Running ESLint on ${files.length} file(s)...`))

  const lintTargets = files.filter((f) =>
    f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
  )

  if (lintTargets.length === 0) {
    console.log(getMessage(folder, `ℹ️  No lintable files.`))
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
    console.log(getMessage(folder, `✅ ESLint passed.`))
  } catch (err) {
    console.error(getMessage(folder, `❌ ESLint failed.`))
    throw err
  }
}

async function runTypeCheckStep(folder, runInDocker) {
  console.log(getMessage(folder, `🔍 Running TypeScript check...`))

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
    console.log(getMessage(folder, `✅ TypeScript check passed.`))
  } catch (err) {
    console.error(getMessage(folder, `❌ TypeScript check failed.`))
    throw err
  }
}

(async () => {
  try {
    const insideDocker = await isInsideDocker()
    const dockerRunning = await isDockerRunning()

    let runInDocker = false

    if (insideDocker) {
      console.log('🐳 Inside Docker environment. Running checks locally.')
    } else if (dockerRunning) {
      const containersNeeded = Object.values(containerMap).filter(Boolean)
      const runningContainers = await Promise.all(
        containersNeeded.map(isContainerRunning)
      )
      const allContainersRunning = runningContainers.every(Boolean)

      if (allContainersRunning) {
        console.log('🐳 Docker and containers are running. Running checks inside Docker.')
        runInDocker = true
      } else {
        console.log('⚠️  Docker is running, but some containers are not. Running checks locally.')
      }
    } else {
      console.log('⚠️  Docker is not running. Running checks locally.')
    }

    const changedFiles = await getChangedFiles()
    const projectFiles = groupFilesByFolder(changedFiles)

    const tasks = []

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        console.log(`⚠️  Skipping missing folder: ${folder}`)
        continue
      }

      const files = projectFiles[folder]

      if (files.length > 0) {
        tasks.push(runLintStep(folder, files, runInDocker))
        tasks.push(runTypeCheckStep(folder, runInDocker))
      } else {
        console.log(getMessage(folder, 'ℹ️  No changed files. Skipping.'))
      }
    }

    // Wait for all tasks to complete, and if any fails, it will throw an error
    await Promise.all(tasks)

    console.log('\n✅ All checks passed. Proceeding with commit.')
    console.timeEnd(label)
    process.exit(0)
  } catch (err) {
    console.error('\n🚫 Commit aborted due to pre-commit errors.')
    console.timeEnd(label)
    process.exit(1)
  }
})()
