import { Schema, model, type InferSchemaType } from 'mongoose';

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';
export type UserStatus = 'invited' | 'active' | 'suspended' | 'deleted';

/**
 * Fields beyond DOMAIN_MODEL.md §2.1 (emailVerificationTokenHash/Expires,
 * passwordResetTokenHash/Expires) were added while implementing Authentication
 * — password reset and email verification weren't modeled as separate
 * collections there. Kept on User rather than new collections since each is a
 * single active token per user, not something with its own query patterns.
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['student', 'teacher', 'parent', 'admin'] satisfies UserRole[],
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'suspended', 'deleted'] satisfies UserStatus[],
      required: true,
      default: 'active',
    },
    emailVerifiedAt: { type: Date, default: null },
    authProvider: { type: String, enum: ['password'], required: true, default: 'password' },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, required: true, default: 0 },

    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
