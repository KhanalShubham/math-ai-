import { RefreshTokenModel } from '../models/refresh-token.model';
import type {
  CreateRefreshTokenInput,
  RefreshTokenRepository,
} from '../../../../modules/auth/auth.repository.interface';
import type { RefreshToken } from '../../../../modules/auth/auth.types';

function toRefreshToken(doc: {
  _id: { toString(): string };
  userId: { toString(): string };
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenHash?: string | null;
}): RefreshToken {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt ?? null,
    replacedByTokenHash: doc.replacedByTokenHash ?? null,
  };
}

export class MongoRefreshTokenRepository implements RefreshTokenRepository {
  async create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    const doc = await RefreshTokenModel.create({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });
    return toRefreshToken(doc);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findOne({ tokenHash }).exec();
    return doc ? toRefreshToken(doc) : null;
  }

  async revoke(id: string, replacedByTokenHash?: string): Promise<void> {
    await RefreshTokenModel.findByIdAndUpdate(id, {
      revokedAt: new Date(),
      ...(replacedByTokenHash ? { replacedByTokenHash } : {}),
    }).exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    ).exec();
  }
}
