import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const label = 'pre-commit';

console.time(label);
console.log('🚀 Starting pre-commit checks...');

const folders = ['api', 'backend', 'frontend', 'mobile'];

const containerMap = {
  api: 'bc-dev-api',
  backend: 'bc-dev-backend',
  frontend: 'bc-dev-frontend',
  mobile: null,
};

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

async function getChangedFiles() {
  try {
    const { stdout } = await execAsync('git diff --cached --name-only');
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('❌ Failed to get changed files:', error);
    return [];
  }
}

function groupFilesByFolder(files) {
  const projectFiles = {};

  for (const folder of folders) {
    projectFiles[folder] = [];
  }

  for (const file of files) {
    for (const folder of folders) {
      if (file.startsWith(folder + '/')) {
        const relativePath = file.substring(folder.length + 1);
        projectFiles[folder].push(relativePath);
        break;
      }
    }
  }

  return projectFiles;
}

const runLintStep = (folder, files) => {
  return new Promise(async (resolve, reject) => {
    if (files.length === 0) {
      resolve();
      return;
    }

    console.log(getMessage(folder, `🔍 Running ESLint on ${files.length} file(s)...`));

    const cwd = folder;
    const lintTargets = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));

    if (lintTargets.length === 0) {
      console.log(getMessage(folder, `ℹ️ No lintable files.`));
      resolve();
      return;
    }

    let fallbackToDocker = !insideDocker;

    try {
      await execAsync(`eslint ${lintTargets.join(' ')} --cache --cache-location .eslintcache`, { cwd });
      console.log(getMessage(folder, `✅ ESLint passed.`));
      resolve();
    } catch (error) {
      if (!fallbackToDocker) {
        console.log(getMessage(folder, `⚠️ ESLint failed locally, but fallback disabled (inside Docker). Skipping.`));
        resolve();
        return;
      }

      const container = containerMap[folder];
      if (!container) {
        console.log(getMessage(folder, `⚠️ No Docker container configured. Skipping ESLint fallback.`));
        resolve();
        return;
      }

      console.log(getMessage(folder, `⚠️ Local ESLint failed, trying Docker fallback...`));

      try {
        await execAsync(
          `docker compose -f docker-compose.yml exec -T ${container} sh -c "cd /bookcars/${folder} && npx eslint ${lintTargets.join(' ')} --cache-location .eslintcache"`
        );
        console.log(getMessage(folder, `✅ ESLint passed (in Docker).`));
        resolve();
      } catch (dockerError) {
        console.log(getMessage(folder, `❌ ESLint failed in Docker too.`));
        reject(dockerError);
      }
    }
  });
};

const runTypeCheckStep = (folder) => {
  return new Promise(async (resolve, reject) => {
    console.log(getMessage(folder, `🔍 Running TypeScript check...`));

    const cwd = folder;
    let fallbackToDocker = !insideDocker;

    try {
      await execAsync('npm run type-check', { cwd });
      console.log(getMessage(folder, `✅ TypeScript check passed.`));
      resolve();
    } catch (error) {
      if (!fallbackToDocker) {
        console.log(getMessage(folder, `⚠️ TypeScript check failed locally, but fallback disabled (inside Docker). Skipping.`));
        resolve();
        return;
      }

      const container = containerMap[folder];
      if (!container) {
        console.log(getMessage(folder, `⚠️ No Docker container configured. Skipping TypeScript fallback.`));
        resolve();
        return;
      }

      console.log(getMessage(folder, `⚠️ Local TypeScript check failed, trying Docker fallback...`));

      try {
        await execAsync(
          `docker compose -f docker-compose.yml exec -T ${container} sh -c "cd /bookcars/${folder} && npm run type-check"`
        );
        console.log(getMessage(folder, `✅ TypeScript check passed (in Docker).`));
        resolve();
      } catch (dockerError) {
        console.log(getMessage(folder, `❌ TypeScript check failed in Docker too.`));
        reject(dockerError);
      }
    }
  });
};

(async () => {
  try {
    const changedFiles = await getChangedFiles();
    const projectFiles = groupFilesByFolder(changedFiles);

    const tasks = [];

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        console.log(`⚠️ Skipping missing folder: ${folder}`);
        continue;
      }

      const files = projectFiles[folder];

      if (files.length > 0) {
        tasks.push(runLintStep(folder, files));    // Only lint if files changed
        tasks.push(runTypeCheckStep(folder));       // Only type-check if files changed
      } else {
        console.log(getMessage(folder, 'ℹ️ No changed files. Skipping.'));
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
