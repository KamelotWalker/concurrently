import { killTree } from 'quiet-kill-tree';
import { beforeEach, expect, it, vi } from 'vitest';

import { killProcess } from './kill-process.js';

vi.mock('quiet-kill-tree', () => ({ killTree: vi.fn() }));

beforeEach(() => {
    vi.resetAllMocks();
});

it('passes the pid and signal to the promise-based killer', async () => {
    vi.mocked(killTree).mockResolvedValue({ pid: 123, killed: true });
    await expect(killProcess(123, 'SIGINT')).resolves.toBeUndefined();
    expect(killTree).toHaveBeenCalledExactlyOnceWith(123, {
        signal: process.platform === 'win32' ? undefined : 'SIGINT',
    });
});

it('leaves the default signal to the killer', async () => {
    await killProcess(123);
    expect(killTree).toHaveBeenCalledExactlyOnceWith(123, { signal: undefined });
});

it('preserves case-insensitive signals', async () => {
    await killProcess(123, 'sigterm');
    expect(killTree).toHaveBeenCalledExactlyOnceWith(123, {
        signal: process.platform === 'win32' ? undefined : 'SIGTERM',
    });
});

it.each(['not-found', 'already-exited'] as const)(
    'treats %s as completed cleanup',
    async (reason) => {
        vi.mocked(killTree).mockResolvedValue({ pid: 123, killed: false, reason });
        await expect(killProcess(123)).resolves.toBeUndefined();
    },
);

it('preserves best-effort behavior for asynchronous failures', async () => {
    vi.mocked(killTree).mockRejectedValue(new Error('access denied'));
    await expect(killProcess(123)).resolves.toBeUndefined();
});

it('preserves best-effort behavior for synchronous failures', async () => {
    vi.mocked(killTree).mockImplementation(() => {
        throw new TypeError('invalid signal');
    });
    await expect(killProcess(123, 'invalid')).resolves.toBeUndefined();
});
