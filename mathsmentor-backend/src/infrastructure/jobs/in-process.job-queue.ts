import { logger } from '../logging/logger';
import type { JobQueue } from './job-queue.interface';

type JobHandler<TPayload = unknown> = (payload: TPayload) => Promise<void>;

/**
 * Day-one JobQueue implementation: fires the handler on setImmediate, no retries,
 * no persistence. Suitable ONLY for low-stakes, fast, best-effort work.
 *
 * Anything AI-driven (study plan generation, weekly reports) should be wired
 * against this SAME interface from the first line of code, so swapping in
 * BullMQ (backed by the Redis already in the stack) is a one-file change,
 * not a retrofit (ARCHITECTURE.md §21.3).
 */
export class InProcessJobQueue implements JobQueue {
  private readonly handlers = new Map<string, JobHandler>();

  register<TPayload>(jobType: string, handler: JobHandler<TPayload>): void {
    this.handlers.set(jobType, handler as JobHandler);
  }

  enqueue<TPayload>(jobType: string, payload: TPayload): Promise<void> {
    const handler = this.handlers.get(jobType);
    if (!handler) {
      logger.warn({ jobType }, 'No handler registered for job type');
      return Promise.resolve();
    }
    setImmediate(() => {
      handler(payload).catch((err: unknown) => {
        logger.error({ err, jobType }, 'Background job failed');
      });
    });
    return Promise.resolve();
  }
}
