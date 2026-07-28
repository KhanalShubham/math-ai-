import { Schema, model, type InferSchemaType } from 'mongoose';

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';
export type UserStatus = 'invited' | 'active' | 'suspended' | 'deleted';

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
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
