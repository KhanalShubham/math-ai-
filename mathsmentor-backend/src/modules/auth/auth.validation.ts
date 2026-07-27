import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 10;

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128),
  role: z.enum(['student', 'teacher', 'parent']), // admin accounts are provisioned out-of-band, never self-registered
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
