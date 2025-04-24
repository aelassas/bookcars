import child_process from 'child_process'
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

    child_process.exec(step.command, { cwd: folder, stdio: 'inherit' }, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red(getMessage(folder, `❌ ${step.name} failed.`)))
        reject(error)
      } else {
        console.log(chalk.green(getMessage(folder, `✅ ${step.name} passed.`)))
        resolve()
      }
    })
  })
}

const tasks = []

for (const folder of folders) {
  for (const step of steps) {
    tasks.push(runStep(folder, step))
  }
}

Promise.all(tasks)
  .then(() => {
    console.log(chalk.greenBright('\n✅ All checks passed. Proceeding with commit.'))
    console.timeEnd(label)
    process.exit(0)
  })
  .catch(() => {
    console.log(chalk.redBright('\n🚫 Commit aborted due to pre-commit errors.'))
    console.timeEnd(label)
    process.exit(1)
  })
