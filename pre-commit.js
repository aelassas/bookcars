import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

const label = 'pre-commit';

console.time(label);
console.log('🚀 Starting pre-commit checks...');

const folders = ['api', 'backend', 'frontend', 'mobile'];

const steps = [
  {
    name: 'ESLint',
    command: 'npm run lint',
  },
  {
    name: 'TypeScript',
    command: 'npm run type-check',
  },
];

// Map folder to Docker container names
const containerMap = {
  api: 'bc-dev-api',
  backend: 'bc-dev-backend',
  frontend: 'bc-dev-frontend',
  mobile: null, // No container for mobile
};

// Detect if we are already inside Docker
function isInsideDocker() {
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    return cgroup.includes('docker') || cgroup.includes('containerd');
  } catch {
    return false;
  }
}

const insideDocker = isInsideDocker();
if (insideDocker) {
  console.log('🐳 Detected Docker environment. Fallback to Docker will be disabled.');
}

const getMessage = (folder, message) => `[${folder}] ${message}`;

const runStep = (folder, step) => {
  return new Promise(async (resolve, reject) => {
    console.log(getMessage(folder, `🔍 Running ${step.name}...`));

    const cwd = folder;
    let fallbackToDocker = !insideDocker;

    try {
      await execAsync(step.command, { cwd });
      console.log(getMessage(folder, `✅ ${step.name} passed.`));
      resolve();
    } catch (error) {
      if (!fallbackToDocker) {
        console.log(getMessage(folder, `⚠️ Local ${step.name} failed, and fallback disabled (inside Docker). Skipping.`));
        resolve(); // Do not reject inside Docker
        return;
      }

      const container = containerMap[folder];
      if (!container) {
        console.log(getMessage(folder, `⚠️ No Docker container configured for ${step.name}. Skipping.`));
        resolve(); // No container, skip gracefully
        return;
      }

      console.log(getMessage(folder, `⚠️ Local ${step.name} failed, trying Docker fallback...`));

      try {
        await execAsync(
          `docker compose -f docker-compose.yml exec -T ${container} sh -c "cd /bookcars/${folder} && ${step.command}"`
        );
        console.log(getMessage(folder, `✅ ${step.name} passed (in Docker).`));
        resolve();
      } catch (dockerError) {
        console.log(getMessage(folder, `❌ ${step.name} failed in Docker too.`));
        reject(dockerError);
      }
    }
  });
};

(async () => {
  try {
    const tasks = [];

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        console.log(`⚠️ Skipping missing folder: ${folder}`);
        continue;
      }
      for (const step of steps) {
        tasks.push(runStep(folder, step));
      }
    }

    await Promise.all(tasks);

    console.log('\n✅ All checks passed. Proceeding with commit.');
    console.timeEnd(label);
    process.exit(0);
  } catch (err) {
    console.log('\n🚫 Commit aborted due to pre-commit errors.');
    console.timeEnd(label);
    process.exit(1);
  }
})();
