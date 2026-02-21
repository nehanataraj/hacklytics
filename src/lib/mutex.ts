/**
 * A simple promise-queue mutex that serialises async (or sync) write tasks.
 *
 * Why: Next.js API routes for the same process can be in-flight concurrently.
 * Without serialisation the read-modify-write cycle on npcs.json could race:
 *   Request A reads [] → Request B reads [] → A writes [x] → B writes [y] (x lost).
 *
 * Usage:
 *   const result = await writeMutex.run(() => expensiveWrite());
 */
export class Mutex {
  private _queue: Promise<void> = Promise.resolve();

  run<T>(task: () => T | Promise<T>): Promise<T> {
    // Chain this task after whatever is currently queued.
    const result = this._queue.then(() => task());
    // Advance the queue; swallow errors so the next task is never blocked.
    this._queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

/** Module-level singleton — one queue per Next.js worker process. */
export const writeMutex = new Mutex();
