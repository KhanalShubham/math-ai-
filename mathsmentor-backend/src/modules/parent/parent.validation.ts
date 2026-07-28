import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const linkStudentSchema = z.object({
  studentEmail: z.string().email(),
});

export const studentIdParamSchema = z.object({ studentId: objectIdSchema });

export const updateNotificationPreferencesSchema = z
  .object({
    email: z.boolean(),
    sms: z.boolean(),
  })
  .partial();

export type LinkStudentInput = z.infer<typeof linkStudentSchema>;
export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
