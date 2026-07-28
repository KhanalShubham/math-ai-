import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const sessionIdParamSchema = z.object({ sessionId: objectIdSchema });

/**
 * Only self_selected/ai_recommended are reachable from the student-facing
 * route — teacher_assigned sessions are created from a future teacher-module
 * endpoint (no teacher module exists yet), never self-declared by a student.
 */
export const startSessionSchema = z.object({
  source: z.enum(['self_selected', 'ai_recommended']),
  topicIds: z.array(objectIdSchema).min(1),
});

export const submitPracticeItemSchema = z.object({
  questionId: objectIdSchema,
  studentAnswer: z.unknown(),
  timeTakenMs: z.number().int().min(0),
  hintsUsedCount: z.number().int().min(0),
});

export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type SubmitPracticeItemInput = z.infer<typeof submitPracticeItemSchema>;
