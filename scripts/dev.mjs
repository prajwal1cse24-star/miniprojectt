import { spawn, execSync } from 'node:child_process';
import net from 'node:net';

const backendPort = 5000;
const frontendPort = 5173;
const isWindows = process.platform === 'win32';
const npmCommand = 'npm';

function quoteWindowsArg(value) {
  if (!/[\s"]/.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, '$1$1\\"')}"`;
}

function run(command, args, options = {}) {
  if (isWindows) {
    const commandLine = [command, ...args].map(quoteWindowsArg).join(' ');
    return spawn('cmd.exe', ['/d', '/s', '/c', commandLine], {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
  }

  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  return child;
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port, host });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 300);
      });
    };

    attempt();
  });
}

let backendProcess;
let frontendProcess;
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of [frontendProcess, backendProcess]) {
    if (child && !child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  for (const child of [frontendProcess, backendProcess]) {
    if (child && !child.killed) {
      child.kill();
    }
  }
});

try {
  execSync('npx kill-port 5000', { stdio: 'ignore' });
} catch (killError) {
  // Ignore if kill-port is not available or the port cannot be killed.
}

backendProcess = run(npmCommand, ['run', 'dev', '--prefix', 'backend']);
backendProcess.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    shutdown(code ?? 1);
  }
});

try {
  await waitForPort(backendPort);
} catch (error) {
  console.error(error.message);
  shutdown(1);
}

frontendProcess = run(npmCommand, ['run', 'dev:client']);
frontendProcess.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    shutdown(code ?? 1);
  }
});
