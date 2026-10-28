import { killTree } from 'quiet-kill-tree';

/** The default implementation of the fire-and-forget KillProcess hook. */
export async function killProcess(pid: number, signal?: string): Promise<void> {
    try {
        await killTree(pid, {
            // Windows has always ignored signals; Node accepts case-insensitive POSIX signals.
            signal:
                process.platform === 'win32'
                    ? undefined
                    : (signal?.toUpperCase() as NodeJS.Signals | undefined),
        });
    } catch {
        // Like tree-kill without a callback, termination is best-effort. Command completion
        // still comes from the child process's close event, not the kill operation.
    }
}
