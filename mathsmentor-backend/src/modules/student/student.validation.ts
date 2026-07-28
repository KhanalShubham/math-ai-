import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const createStudentProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  dateOfBirth: z.coerce.date(),
  examBoard: z.enum(['AQA', 'Edexcel', 'OCR', 'WJEC']),
  tier: z.enum(['foundation', 'higher']),
  targetGrade: z.number().int().min(1).max(9).optional(),
});

export const updateStudentProfileSchema = z
  .object({
    displayName: z.string().min(1).max(100),
    examBoard: z.enum(['AQA', 'Edexcel', 'OCR', 'WJEC']),
    tier: z.enum(['foundation', 'higher']),
    targetGrade: z.number().int().min(1).max(9),
    onboardingCompletedAt: z.coerce.date(),
  })
  .partial();

export const classIdParamSchema = z.object({ classId: objectIdSchema });
export const parentIdParamSchema = z.object({ parentId: objectIdSchema });

export type CreateStudentProfileInput = z.infer<typeof createStudentProfileSchema>;
export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;
export type ClassIdParam = z.infer<typeof classIdParamSchema>;
export type ParentIdParam = z.infer<typeof parentIdParamSchema>;
