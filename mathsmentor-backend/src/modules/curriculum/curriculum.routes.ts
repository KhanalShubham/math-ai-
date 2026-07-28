import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { createQuestionController, createTopicController } from './curriculum.controller';
import type { QuestionService, TopicService } from './curriculum.service';
import {
  addPrerequisiteSchema,
  createQuestionSchema,
  createTopicSchema,
  listQuestionsQuerySchema,
  listTopicsQuerySchema,
  questionIdParamSchema,
  topicIdParamSchema,
} from './curriculum.validation';

/**
 * Topic/Question are admin-authored content (DOMAIN_MODEL.md §2.5/§2.6) —
 * every write route is admin-only. Reads are open to any authenticated role
 * since diagnostic/practice selection and student-facing views all need them.
 */
export function createCurriculumRouter(
  topicService: TopicService,
  questionService: QuestionService,
): Router {
  const router = Router();
  const topics = createTopicController(topicService);
  const questions = createQuestionController(questionService);

  router.post(
    '/topics',
    requireAuth,
    requireRole('admin'),
    validate(createTopicSchema),
    topics.create,
  );
  router.get(
    '/topics',
    requireAuth,
    validate(listTopicsQuerySchema, 'query'),
    topics.list,
  );
  router.get(
    '/topics/:topicId',
    requireAuth,
    validate(topicIdParamSchema, 'params'),
    topics.get,
  );
  router.post(
    '/topics/:topicId/prerequisites',
    requireAuth,
    requireRole('admin'),
    validate(topicIdParamSchema, 'params'),
    validate(addPrerequisiteSchema),
    topics.addPrerequisite,
  );
  router.post(
    '/topics/:topicId/publish',
    requireAuth,
    requireRole('admin'),
    validate(topicIdParamSchema, 'params'),
    topics.publish,
  );

  router.post(
    '/questions',
    requireAuth,
    requireRole('admin'),
    validate(createQuestionSchema),
    questions.create,
  );
  router.get(
    '/questions',
    requireAuth,
    validate(listQuestionsQuerySchema, 'query'),
    questions.listForTopic,
  );
  router.get(
    '/questions/:questionId',
    requireAuth,
    requireRole('admin'),
    validate(questionIdParamSchema, 'params'),
    questions.getInternal,
  );
  router.get(
    '/questions/:questionId/public',
    requireAuth,
    validate(questionIdParamSchema, 'params'),
    questions.getPublic,
  );
  router.post(
    '/questions/:questionId/publish',
    requireAuth,
    requireRole('admin'),
    validate(questionIdParamSchema, 'params'),
    questions.publish,
  );
  router.post(
    '/questions/:questionId/retire',
    requireAuth,
    requireRole('admin'),
    validate(questionIdParamSchema, 'params'),
    questions.retire,
  );

  return router;
}
