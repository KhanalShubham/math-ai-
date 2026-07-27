import { InProcessEventBus } from '../infrastructure/events/in-process.event-bus';
import type { EventBus } from '../infrastructure/events/event-bus.interface';
import { InProcessJobQueue } from '../infrastructure/jobs/in-process.job-queue';
import type { JobQueue } from '../infrastructure/jobs/job-queue.interface';
import { logger } from '../infrastructure/logging/logger';
import { MongoUserRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-user.repository';
import { MongoRefreshTokenRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-refresh-token.repository';
import { createAuthService, type AuthService } from '../modules/auth/auth.service';

/**
 * Manual composition root (ARCHITECTURE.md §13). No DI framework — the object
 * graph is shallow enough that explicit wiring here is more readable and more
 * debuggable than decorator-based injection.
 *
 * As modules are added, each module's factory function is wired here:
 * `const studentService = createStudentService({ repository, eventBus })`.
 * Nothing outside this file should reach for a concrete infrastructure
 * implementation directly — services depend on the interfaces re-exported here.
 */
export interface Container {
  logger: typeof logger;
  eventBus: EventBus;
  jobQueue: JobQueue;
  authService: AuthService;
}

export function createContainer(): Container {
  const eventBus = new InProcessEventBus();
  const jobQueue = new InProcessJobQueue();

  const userRepository = new MongoUserRepository();
  const refreshTokenRepository = new MongoRefreshTokenRepository();
  const authService = createAuthService({ userRepository, refreshTokenRepository, eventBus });

  return {
    logger,
    eventBus,
    jobQueue,
    authService,
  };
}
