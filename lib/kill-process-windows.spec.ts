import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

import { killProcess } from './kill-process.js';

it.runIf(process.platform === 'win32')(
    'kills a Windows shell and its descendants',
    async () => {
        const fixture = fileURLToPath(new URL('./__fixtures__/process-tree.mjs', import.meta.url));
        const shell = spawn(
            process.env.ComSpec || 'cmd.exe',
            ['/d', '/s', '/c', `""${process.execPath}" "${fixture}""`],
            { windowsVerbatimArguments: true },
        );
        const pids: number[] = [];
        const output = createInterface({ input: shell.stdout });
        // The project's TypeScript lib predates Promise.withResolvers.
        const ready = new Promise<void>((resolve, reject) => {
            output.on('line', (line) => {
                pids.push(Number(line));
                if (pids.length === 3) {
                    resolve();
                }
            });
            shell.once('error', reject);
            shell.once('exit', () =>
                reject(new Error('Process tree exited before becoming ready')),
            );
        });
        try {
            await ready;
            const closed = once(shell, 'close');
            await killProcess(shell.pid!);
            await closed;
            for (const pid of [shell.pid!, ...pids]) {
                expect(() => process.kill(pid, 0)).toThrow(
                    expect.objectContaining({ code: 'ESRCH' }),
                );
            }
            await expect(killProcess(shell.pid!)).resolves.toBeUndefined();
        } finally {
            output.close();
            await killProcess(shell.pid!);
            for (const pid of pids) {
                await killProcess(pid);
            }
        }
    },
    15_000,
);
