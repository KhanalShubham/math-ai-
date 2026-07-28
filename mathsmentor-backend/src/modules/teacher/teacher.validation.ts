import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const createTeacherProfileSchema = z.object({
  schoolId: objectIdSchema,
  subjects: z.array(z.string().min(1)).min(1),
});

export const createSchoolSchema = z.object({
  name: z.string().min(1).max(200),
  address: z
    .object({
      line1: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      country: z.string().max(100).optional(),
    })
    .default({}),
  subscriptionTier: z.enum(['trial', 'standard', 'premium']),
  contactEmail: z.string().email(),
});

export const schoolIdParamSchema = z.object({ schoolId: objectIdSchema });

export const createClassGroupSchema = z.object({
  schoolId: objectIdSchema,
  name: z.string().min(1).max(200),
  examBoard: z.string().min(1).max(50),
  tier: z.enum(['foundation', 'higher']),
  academicYear: z.string().regex(/^\d{4}\/\d{2}$/, 'Expected format YYYY/YY, e.g. 2025/26'),
});

export const classIdParamSchema = z.object({ classId: objectIdSchema });
export const classAndStudentIdParamSchema = z.object({
  classId: objectIdSchema,
  studentId: objectIdSchema,
});

export const addTeacherToClassSchema = z.object({
  teacherUserId: objectIdSchema,
});

export const enrollStudentSchema = z.object({
  studentId: objectIdSchema,
});

export type CreateTeacherProfileInput = z.infer<typeof createTeacherProfileSchema>;
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type SchoolIdParam = z.infer<typeof schoolIdParamSchema>;
export type CreateClassGroupInput = z.infer<typeof createClassGroupSchema>;
export type ClassIdParam = z.infer<typeof classIdParamSchema>;
export type ClassAndStudentIdParam = z.infer<typeof classAndStudentIdParamSchema>;
export type AddTeacherToClassInput = z.infer<typeof addTeacherToClassSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
