import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { constants } from 'node:fs'
import asyncFs from 'node:fs/promises'
import os from 'node:os'
import pLimit from 'p-limit'
import chalk from 'chalk'

const execAsync = promisify(exec)

// Configuration for the pre-commit checks
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
  timeout: 2000, // Timeout for Docker commands in milliseconds
  dockerComposeFile: 'docker-compose.dev.yml',
  maxFileSizeKB: 5 * 1024, // 5MB file size limit
  batchSize: 75, // Number of files to process in a batch for ESLint and size checks
  concurrencyLimit: Math.min(6, Math.max(2, Math.floor(os.cpus().length / 2))), // Adaptive concurrency limit for ESLint batches
  lintFilter: /\.(ts|tsx|js|jsx)$/, // Lint only TypeScript and JavaScript files (.ts, .tsx, .js, .jsx)
  typeCheckFilter: /\.(ts|tsx)$/, // Type check only TypeScript files (.ts, .tsx)
}

// Logger utilities
const logger = (() => {
  const _fixMessage = (message) => {
    const isVSCodeTerminal = process.env.TERM_PROGRAM?.includes('vscode')
    return isVSCodeTerminal ? message.replace(/(ℹ️|⚠️)/g, '$1 ') : message
  }

  const _formatMessage = (folder, message) => {
    return `[${chalk.cyan(folder)}] ${message}`
  }

  return {
    log(message) {
      console.log(_fixMessage(message))
    },
    logProject(project, message) {
      console.log(_fixMessage(_formatMessage(project.folder, message)))
    },
    logError(message, ...args) {
      console.error(chalk.red(_fixMessage(message)), ...args)
    },
    logProjectError(project, message, ...args) {
      console.error(chalk.red(_fixMessage(_formatMessage(project.folder, message))), ...args)
    }
  }
})()

// Docker environment detection
const docker = {
  async isInsideDocker() {
    try {
      const cgroup = await asyncFs.readFile('/proc/1/cgroup', 'utf8')
      return cgroup.includes('docker') || cgroup.includes('containerd')
    } catch {
      return false
    }
  },

  async isDockerRunning() {
    try {
      await execAsync('docker info', { timeout: config.timeout })
      return true
    } catch {
      return false
    }
  },

  async isContainerRunning(containerName) {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${containerName}" --filter "status=running" --format "{{.Names}}"`,
        { timeout: config.timeout },
      )
      return stdout.trim().includes(containerName)
    } catch {
      return false
    }
  }
}

// Git operations
const git = {
  // Get all staged files at once, more efficient than multiple git calls
  async getChangedFiles() {
    try {
      const { stdout } = await execAsync('git diff --cached --name-only')
      return stdout.trim().split('\n').filter(Boolean)
    } catch (err) {
      logger.logError('❌ Failed to get changed files:', err.message)
      return []
    }
  },
  async getChangedFilesInProject(project) {
    try {
      const { folder } = project
      const { stdout } = await execAsync(`git diff --cached --name-only ${folder}/`)
      return stdout.trim().split('\n').filter(Boolean).map((file) => file.replace(`${folder}/`, ''))
    } catch (err) {
      logProjectError(project, '❌ Failed to get changed files:', err)
      return []
    }
  }
}

// File system operations
const fs = {
  async pathExists(filePath) {
    try {
      await asyncFs.access(filePath, constants.F_OK)
      return true
    } catch {
      return false
    }
  },

  async getFileStats(filePath) {
    try {
      const stats = await asyncFs.stat(filePath)
      return stats
    } catch {
      return null
    }
  },

  // Process files in parallel batches
  async processBatch(files, processor, batchSize = config.batchSize) {
    const results = []

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(processor))
      results.push(...batchResults)
    }

    return results
  }
}

// Command execution
const cmd = (() => {
  const _escapeShellArg = (arg) => {
    return arg.replace(/(["'\\$`!])/g, '\\$1')
  }

  return {
    async run(command, options = {}) {
      try {
        const { stdout, stderr } = await execAsync(command, {
          ...options,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
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
    },

    async runInContext(project, command, runInDocker) {
      const { folder, container } = project
      const safeFolder = _escapeShellArg(folder)
      const safeCmd = _escapeShellArg(command)

      if (runInDocker && container) {
        return cmd.run(
          `docker compose -f ${config.dockerComposeFile} exec -T ${container} sh -c "cd /bookcars/${safeFolder} && ${safeCmd}"`,
          { cwd: process.cwd() },
        )
      }

      return cmd.run(safeCmd, { cwd: safeFolder })
    }
  }
})()

// Process files by project
const processFiles = {
  groupFilesByFolder(files) {
    // Create lookup map for faster folder checks
    const folderMap = new Map()

    for (const { folder } of Object.values(config.projects)) {
      folderMap.set(folder, [])
    }

    // Single-pass processing with minimal operations
    for (const file of files) {
      const slashIndex = file.indexOf('/')

      // Skip files without a folder structure
      if (slashIndex === -1) {
        continue
      }

      const folder = file.slice(0, slashIndex)

      // Only process folders we care about
      if (folderMap.has(folder)) {
        folderMap.get(folder).push(file.slice(slashIndex + 1))
      }
    }

    // Convert map to object
    return Object.fromEntries(folderMap)
  },

  filterFiles(files, regex) {
    return files.filter((file) => regex.test(file))
  }
}

// Check implementations
const checks = {
  async lint(project, files, runInDocker) {
    if (files.length === 0) {
      return
    }

    const targets = processFiles.filterFiles(files, config.lintFilter)

    if (targets.length === 0) {
      logger.logProject(project, 'ℹ️ No lintable files.')
      return
    }

    logger.logProject(project, `🔍 Running ESLint on ${targets.length} file(s) with concurrency ${config.concurrencyLimit}...`)

    // Split into file batches to handle command line length limits
    const batches = []
    for (let i = 0; i < targets.length; i += config.batchSize) {
      batches.push(targets.slice(i, i + config.batchSize))
    }

    const limit = pLimit(config.concurrencyLimit)

    const tasks = batches.map((batch, index) =>
      limit(async () => {
        logger.logProject(project, `🧪 Linting batch ${index + 1} of ${batches.length}...`)
        await cmd.runInContext(
          project,
          `npx eslint ${batch.join(' ')} --cache --cache-location .eslintcache --quiet`,
          runInDocker,
        )
      })
    )

    try {
      await Promise.all(tasks)
      logger.logProject(project, `${chalk.green('✅ ESLint passed.')}`)
    } catch (err) {
      logger.logProjectError(project, '❌ ESLint failed.')
      throw err
    }
  },

  async typeCheck(project, files, runInDocker) {
    if (files.length === 0) {
      return
    }

    const targets = processFiles.filterFiles(files, config.typeCheckFilter)

    if (targets.length === 0) {
      logger.logProject(project, `ℹ️ No TypeScript files to check.`)
      return
    }

    logger.logProject(project, `🔍 Running TypeScript check...`)

    try {
      await cmd.runInContext(
        project,
        'npx tsc --noEmit --incremental --pretty',
        runInDocker,
      )
      logger.logProject(project, `${chalk.green('✅ TypeScript check passed.')}`)
    } catch (err) {
      logger.logProjectError(project, `❌ TypeScript check failed.`)
      throw err
    }
  },

  async sizeCheck(project, files) {
    if (files.length === 0) {
      return
    }

    const { folder } = project
    logger.logProject(project, `📏 Checking file sizes...`)

    const oversizedFiles = []

    // Process files in parallel batches for better performance
    await fs.processBatch(files, async (file) => {
      const filePath = path.join(folder, file)
      const stats = await fs.getFileStats(filePath)

      if (stats) {
        const sizeKB = stats.size / 1024
        if (sizeKB > config.maxFileSizeKB) {
          oversizedFiles.push({ file, sizeKB: sizeKB.toFixed(2) })
        }
      }
    })

    if (oversizedFiles.length > 0) {
      logger.logProjectError(project, `❌ Found ${oversizedFiles.length} files exceeding size limit (${config.maxFileSizeKB}KB):`)
      oversizedFiles.forEach(({ file, sizeKB }) => {
        logger.logProjectError(project, `  - ${file} (${sizeKB}KB)`)
      })
      throw new Error(`Oversized files detected in ${folder}`)
    }

    logger.logProject(project, `${chalk.green('✅ All files are within size limits.')}`)
  }
}

// Main execution function
const main = async () => {
  const label = 'pre-commit'
  console.time(label)
  logger.log('🚀 Starting pre-commit checks...')

  try {
    // Run these checks in parallel to save time
    const [insideDocker, dockerRunning, changedFiles] = await Promise.all([
      docker.isInsideDocker(),
      docker.isDockerRunning(),
      git.getChangedFiles(),
    ])

    // Determine if we should run in Docker
    let runInDocker = false

    if (insideDocker) {
      logger.log('🐳 Inside Docker environment. Running checks locally...')
    } else if (dockerRunning) {
      const containersNeeded = Object.values(config.projects)
        .filter((project) => project.container)
        .map((project) => project.container)
      const runningContainers = await Promise.all(containersNeeded.map(docker.isContainerRunning))

      runInDocker = runningContainers.every(Boolean)

      if (runInDocker) {
        logger.log('🐳 Docker and containers are running. Running checks inside Docker...')
      } else {
        logger.log('⚠️ Docker is running, but some containers are not. Running checks locally...')
      }
    } else {
      logger.log('⚠️ Docker is not running. Running checks locally...')
    }

    // Group files by project folder
    const projectFiles = processFiles.groupFilesByFolder(changedFiles)

    const tasks = []

    for (const [projectName, project] of Object.entries(config.projects)) {
      const { folder, checks: projectChecks } = project

      if (!folder) {
        logger.logProject({ folder: projectName }, '⚠️ Missing folder config. Skipping.')
        continue
      }

      if (!(await fs.pathExists(folder))) {
        logger.logProject(project, '⚠️ Folder not found. Skipping.')
        continue
      }

      const files = projectFiles[folder]

      if (files.length === 0) {
        logger.logProject(project, 'ℹ️ No changed files. Skipping.')
        continue
      }

      if (!projectChecks || projectChecks.length === 0) {
        logger.logProject(project, 'ℹ️ No checks configured. Skipping.')
        continue
      }

      const projectTasks = []

      if (projectChecks.includes('lint')) {
        projectTasks.push(checks.lint(project, files, runInDocker))
      }

      if (projectChecks.includes('typeCheck')) {
        projectTasks.push(checks.typeCheck(project, files, runInDocker))
      }

      if (projectChecks.includes('sizeCheck')) {
        projectTasks.push(checks.sizeCheck(project, files))
      }

      // Run checks in parallel per project
      tasks.push(Promise.all(projectTasks))
    }

    // Wait for all tasks to complete, and if any fails, it will throw an error
    await Promise.all(tasks)

    logger.log(`\n${chalk.green('✅ All checks passed. Proceeding with commit.')}`)
    console.timeEnd(label)
    process.exit(0)
  } catch {
    logger.logError('\n🚫 Commit aborted due to pre-commit errors.')
    console.timeEnd(label)
    process.exit(1)
  }
}

main() // Run pre-commit checks
