import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function run(command) {
  execSync(command, { stdio: 'ignore' });
}

function killPorts(ports) {
  if (process.platform === 'win32') {
    const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const lines = output.split(/\r?\n/);
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const localAddress = parts[1] ?? '';
      const state = parts[3] ?? '';
      const pid = parts[4] ?? '';
      if (state !== 'LISTENING') continue;

      for (const port of ports) {
        if (localAddress.endsWith(`:${port}`) && Number(pid) > 0) {
          pids.add(pid);
        }
      }
    }

    for (const pid of pids) {
      try {
        run(`taskkill /PID ${pid} /F >nul 2>nul`);
      } catch {
        // no-op
      }
    }

    return;
  }

  for (const port of ports) {
    try {
      run(`lsof -ti:${port} | xargs kill -9`);
    } catch {
      // no-op
    }
  }
}

function removeDirWithRetry(targetPath, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (existsSync(targetPath)) {
        rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      }
      return;
    } catch {
      if (attempt === retries) {
        throw new Error(`Cleanup failed for ${targetPath}`);
      }
      sleep(400);
    }
  }
}

try {
  killPorts([3000, 4000]);
  sleep(500);

  removeDirWithRetry(join(process.cwd(), 'apps', 'web', '.next'));
  removeDirWithRetry(join(process.cwd(), 'apps', 'api', 'dist'));

  console.log('Dev cleanup completed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unknown cleanup error');
  process.exit(1);
}
