import { execSync } from 'child_process'
import chalk from 'chalk'

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

let hasError = false

for (const folder of folders) {
  for (const step of steps) {
    console.log(chalk.blue(getMessage(folder, `🔍 Running ${step.name}...`)))

    try {
      execSync(step.command, { cwd: folder, stdio: 'inherit' })
      console.log(chalk.green(getMessage(folder, `✅ ${step.name} passed.`)))
    } catch (error) {
      console.error(chalk.red(getMessage(folder, `❌ ${step.name} failed.`)))
      hasError = true
    }
  }
}


if (hasError) {
  console.log(chalk.redBright('\n🚫 Commit aborted due to pre-commit errors.'))
  process.exit(1)
} else {
  console.log(chalk.greenBright('\n✅ All checks passed. Proceeding with commit.'))
}
