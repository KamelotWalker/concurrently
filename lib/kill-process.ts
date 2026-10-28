import { killTree, KillTreeError } from 'quiet-kill-tree';

/** The default implementation of the fire-and-forget KillProcess hook. */
export function killProcess(pid: number, signal?: string): Promise<void> {
    // Keep synchronous validation errors visible to the caller.
    return killTree(pid, {
        signal: process.platform === 'win32' ? undefined : (signal as NodeJS.Signals | undefined),
    }).then(
        () => {},
        (error: unknown) => {
            if (!(error instanceof KillTreeError)) {
                throw error;
            }
            // Like tree-kill without a callback, asynchronous termination is best-effort.
            // Command completion still comes from the child process's close event.
        },
    );
}
