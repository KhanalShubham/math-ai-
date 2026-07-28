import type { Types } from 'mongoose';
import { UserModel } from '../models/user.model';
import type {
  CreateUserInput,
  UserRepository,
} from '../../../../modules/auth/auth.repository.interface';
import type { User, UserWithCredentials } from '../../../../modules/auth/auth.types';

function toUser(doc: {
  _id: Types.ObjectId;
  email: string;
  role: User['role'];
  status: User['status'];
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  failedLoginAttempts: number;
  createdAt: Date;
}): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    role: doc.role,
    status: doc.status,
    emailVerifiedAt: doc.emailVerifiedAt ?? null,
    lastLoginAt: doc.lastLoginAt ?? null,
    failedLoginAttempts: doc.failedLoginAttempts,
    createdAt: doc.createdAt,
  };
}

export class MongoUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).exec();
    return doc ? toUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).exec();
    return doc ? toUser(doc) : null;
  }

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .exec();
    return doc ? { ...toUser(doc), passwordHash: doc.passwordHash } : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const doc = await UserModel.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
    });
    return toUser(doc);
  }

  async incrementFailedLogin(id: string): Promise<number> {
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true },
    ).exec();
    return doc?.failedLoginAttempts ?? 0;
  }

  async resetFailedLoginAndRecordLogin(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
    }).exec();
  }

  async updateStatus(id: string, status: User['status']): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { status }).exec();
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { passwordHash }).exec();
  }

  async markEmailVerified(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { emailVerifiedAt: new Date() }).exec();
  }
}
