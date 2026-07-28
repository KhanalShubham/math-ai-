import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const createTopicSchema = z.object({
  name: z.string().min(1).max(200),
  examBoard: z.string().min(1).max(50),
  tier: z.enum(['foundation', 'higher', 'both']),
  gradeBand: z.array(z.number().int().min(1).max(9)).min(1),
});

export const listTopicsQuerySchema = z.object({
  examBoard: z.string().min(1).max(50).optional(),
  tier: z.enum(['foundation', 'higher', 'both']).optional(),
  gradeBand: z.coerce.number().int().min(1).max(9).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export const addPrerequisiteSchema = z.object({
  prerequisiteTopicId: objectIdSchema,
});

export const topicIdParamSchema = z.object({ topicId: objectIdSchema });

const answerKeySchema = z.union([
  z.object({ correctOptionId: z.string().min(1) }),
  z.object({ value: z.number(), tolerance: z.number().min(0) }),
  z.object({
    acceptedForms: z.array(z.string().min(1)).min(1),
    equivalenceRule: z.literal('symbolic'),
  }),
  z.object({
    steps: z.array(z.object({ stepAnswerKey: z.unknown() })).min(1),
  }),
]);

export const createQuestionSchema = z.object({
  topicId: objectIdSchema,
  type: z.enum(['mcq', 'numeric', 'algebraic', 'multi-step']),
  difficulty: z.number().int().min(1).max(5),
  promptText: z.string().min(1),
  promptAssets: z.array(z.object({ type: z.string().min(1), url: z.string().url() })).optional(),
  answerKey: answerKeySchema,
  markScheme: z.object({ steps: z.array(z.string()) }).optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const listQuestionsQuerySchema = z.object({
  topicId: objectIdSchema,
  minDifficulty: z.coerce.number().int().min(1).max(5).optional(),
  maxDifficulty: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const questionIdParamSchema = z.object({ questionId: objectIdSchema });

export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type ListTopicsQuery = z.infer<typeof listTopicsQuerySchema>;
export type AddPrerequisiteInput = z.infer<typeof addPrerequisiteSchema>;
export type TopicIdParam = z.infer<typeof topicIdParamSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
export type QuestionIdParam = z.infer<typeof questionIdParamSchema>;
