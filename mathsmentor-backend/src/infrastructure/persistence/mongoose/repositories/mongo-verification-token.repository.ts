import { VerificationTokenModel } from '../models/verification-token.model';
import type {
  CreateVerificationTokenInput,
  VerificationTokenRepository,
} from '../../../../modules/auth/auth.repository.interface';
import type {
  VerificationToken,
  VerificationTokenType,
} from '../../../../modules/auth/auth.types';

function toVerificationToken(doc: {
  _id: { toString(): string };
  userId: { toString(): string };
  type: VerificationTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}): VerificationToken {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt ?? null,
  };
}

export class MongoVerificationTokenRepository implements VerificationTokenRepository {
  async create(input: CreateVerificationTokenInput): Promise<VerificationToken> {
    const doc = await VerificationTokenModel.create({
      userId: input.userId,
      type: input.type,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
    return toVerificationToken(doc);
  }

  async findValidByTokenHash(
    type: VerificationTokenType,
    tokenHash: string,
  ): Promise<VerificationToken | null> {
    const doc = await VerificationTokenModel.findOne({
      type,
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).exec();
    return doc ? toVerificationToken(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    await VerificationTokenModel.findByIdAndUpdate(id, { usedAt: new Date() }).exec();
  }

  async invalidateAllForUser(userId: string, type: VerificationTokenType): Promise<void> {
    await VerificationTokenModel.updateMany(
      { userId, type, usedAt: null },
      { usedAt: new Date() },
    ).exec();
  }
}
