import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const depth = Number(process.argv[2] || 0);
if (depth < 2) {
  spawn(process.execPath, [fileURLToPath(import.meta.url), String(depth + 1)], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}
process.stdout.write(`${process.pid}\n`);
setInterval(() => {}, 1000);
