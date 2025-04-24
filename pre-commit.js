import { exec } from 'child_process'
import chalk from 'chalk'

const label = 'pre-commit'

console.time(label)
console.log(chalk.blue('🚀 Starting pre-commit checks...'))

const folders = ['api', 'backend', 'frontend', 'mobile']

const steps = [
  {
    name: 'ESLint',
    command: 'npm run lint',
  },
  {
    name: 'TypeScript',
    command: 'npm run type-check',
  },
]

const getMessage = (folder, message) => `[${folder}] ${message}`

const runStep = (folder, step) => {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(getMessage(folder, `🔍 Running ${step.name}...`)))

    const child = exec(step.command, { cwd: folder, stdio: 'pipe' }, (error, stdout, stderr) => {
       // Handling stdout
       if (stdout) {
        process.stdout.write(stdout) // Ensure stdout is printed to console in real-time
      }

      // Handling stderr
      if (stderr) {
        process.stderr.write(stderr) // Ensure stderr is printed to console in real-time
      }

      if (error) {
        console.error(chalk.red(getMessage(folder, `❌ ${step.name} failed.`)))
        reject(error)
      } else {
        console.log(chalk.green(getMessage(folder, `✅ ${step.name} passed.`)))
        resolve()
      }
    })

    // // Listen for stdout and stderr streams using 'data' event
    // child.stdout.on('data', (data) => {
    //   process.stdout.write(data)  // Directly write stdout data to the parent process's stdout
    // })

    // child.stderr.on('data', (data) => {
    //   process.stderr.write(data)  // Directly write stderr data to the parent process's stderr
    // })
  })
}

try {
  const tasks = []

  for (const folder of folders) {
    for (const step of steps) {
      tasks.push(runStep(folder, step))
    }
  }

  // Wait for all tasks to complete, and if any fails, it will throw an error
  await Promise.all(tasks)

  console.log(chalk.greenBright('\n✅ All checks passed. Proceeding with commit.'))
  console.timeEnd(label)
  process.exit(0)
} catch (err) {
  console.log(chalk.redBright('\n🚫 Commit aborted due to pre-commit errors.'))
  console.timeEnd(label)
  process.exit(1)
}
