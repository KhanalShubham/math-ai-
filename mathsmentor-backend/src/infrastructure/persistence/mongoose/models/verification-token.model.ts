import { Schema, model, type InferSchemaType } from 'mongoose';

export type VerificationTokenType = 'email_verification' | 'password_reset';

const verificationTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'] satisfies VerificationTokenType[],
      required: true,
    },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

verificationTokenSchema.index({ type: 1, tokenHash: 1 }, { unique: true });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationTokenSchema.index({ userId: 1, type: 1 });

export type VerificationTokenDocument = InferSchemaType<typeof verificationTokenSchema>;
export const VerificationTokenModel = model('VerificationToken', verificationTokenSchema);
