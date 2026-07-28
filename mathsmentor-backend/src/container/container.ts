import { InProcessEventBus } from '../infrastructure/events/in-process.event-bus';
import type { EventBus } from '../infrastructure/events/event-bus.interface';
import { InProcessJobQueue } from '../infrastructure/jobs/in-process.job-queue';
import type { JobQueue } from '../infrastructure/jobs/job-queue.interface';
import { logger } from '../infrastructure/logging/logger';
import { MongoUserRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-user.repository';
import { MongoRefreshTokenRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-refresh-token.repository';
import { MongoVerificationTokenRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-verification-token.repository';
import { MongoStudentRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-student.repository';
import { MongoTopicRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-topic.repository';
import { MongoQuestionRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-question.repository';
import { MongoDiagnosticRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-diagnostic.repository';
import { MongoPracticeRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-practice.repository';
import { MongoMasteryRepository } from '../infrastructure/persistence/mongoose/repositories/mongo-mastery.repository';
import { createAuthService, type AuthService } from '../modules/auth/auth.service';
import { createStudentService, type StudentService } from '../modules/student/student.service';
import { createMasteryService, type MasteryService } from '../modules/student/mastery.service';
import {
  createQuestionService,
  createTopicService,
  type QuestionService,
  type TopicService,
} from '../modules/curriculum/curriculum.service';
import {
  createDiagnosticService,
  type DiagnosticService,
} from '../modules/diagnostic/diagnostic.service';
import { createPracticeService, type PracticeService } from '../modules/practice/practice.service';

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
  studentService: StudentService;
  topicService: TopicService;
  questionService: QuestionService;
  diagnosticService: DiagnosticService;
  practiceService: PracticeService;
  masteryService: MasteryService;
}

export function createContainer(): Container {
  const eventBus = new InProcessEventBus();
  const jobQueue = new InProcessJobQueue();

  const userRepository = new MongoUserRepository();
  const refreshTokenRepository = new MongoRefreshTokenRepository();
  const verificationTokenRepository = new MongoVerificationTokenRepository();
  const authService = createAuthService({
    userRepository,
    refreshTokenRepository,
    verificationTokenRepository,
    eventBus,
  });

  const studentRepository = new MongoStudentRepository();
  const studentService = createStudentService({ studentRepository, eventBus });

  const masteryRepository = new MongoMasteryRepository();
  const masteryService = createMasteryService({ masteryRepository, eventBus });

  const topicRepository = new MongoTopicRepository();
  const questionRepository = new MongoQuestionRepository();
  const topicService = createTopicService({ topicRepository, eventBus });
  const questionService = createQuestionService({ questionRepository, topicRepository, eventBus });

  const diagnosticRepository = new MongoDiagnosticRepository();
  const diagnosticService = createDiagnosticService({
    diagnosticRepository,
    topicRepository,
    questionRepository,
    eventBus,
  });

  const practiceRepository = new MongoPracticeRepository();
  const practiceService = createPracticeService({ practiceRepository, questionRepository, eventBus });

  return {
    logger,
    eventBus,
    jobQueue,
    authService,
    studentService,
    topicService,
    questionService,
    diagnosticService,
    practiceService,
    masteryService,
  };
}
