import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const attemptIdParamSchema = z.object({ attemptId: objectIdSchema });

export const submitItemSchema = z.object({
  questionId: objectIdSchema,
  studentAnswer: z.unknown(),
  timeTakenMs: z.number().int().min(0),
  hintRequested: z.boolean(),
});

export type AttemptIdParam = z.infer<typeof attemptIdParamSchema>;
export type SubmitItemInput = z.infer<typeof submitItemSchema>;
