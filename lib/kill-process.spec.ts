import type * as QuietKillTree from 'quiet-kill-tree';
import { killTree, KillTreeError } from 'quiet-kill-tree';
import { beforeEach, expect, it, vi } from 'vitest';

import { killProcess } from './kill-process.js';

vi.mock('quiet-kill-tree', async (importOriginal) => ({
    ...(await importOriginal<typeof QuietKillTree>()),
    killTree: vi.fn(),
}));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(killTree).mockResolvedValue({ pid: 123, killed: true });
});

it.runIf(process.platform !== 'win32')(
    'forwards the requested POSIX signal unchanged',
    async () => {
        await killProcess(123, 'SIGINT');
        expect(killTree).toHaveBeenCalledExactlyOnceWith(123, { signal: 'SIGINT' });
    },
);

it.runIf(process.platform === 'win32')('ignores the requested signal on Windows', async () => {
    await killProcess(123, 'invalid');
    expect(killTree).toHaveBeenCalledExactlyOnceWith(123, { signal: undefined });
});

it('leaves the default signal to the killer', async () => {
    await killProcess(123);
    expect(killTree).toHaveBeenCalledExactlyOnceWith(123, { signal: undefined });
});

it.each(['not-found', 'already-exited'] as const)(
    'treats %s as completed cleanup',
    async (reason) => {
        vi.mocked(killTree).mockResolvedValue({ pid: 123, killed: false, reason });
        await expect(killProcess(123)).resolves.toBeUndefined();
    },
);

it('preserves best-effort behavior for asynchronous OS failures', async () => {
    vi.mocked(killTree).mockRejectedValue(new KillTreeError('EACCES', 123, 'access denied'));
    await expect(killProcess(123)).resolves.toBeUndefined();
});

it('does not suppress unexpected promise failures', async () => {
    const error = new TypeError('unexpected validation failure');
    vi.mocked(killTree).mockRejectedValue(error);
    await expect(killProcess(123)).rejects.toBe(error);
});

it('surfaces synchronous validation errors synchronously', () => {
    const error = new TypeError('invalid signal');
    vi.mocked(killTree).mockImplementation(() => {
        throw error;
    });
    expect(() => killProcess(123, 'invalid')).toThrow(error);
});
