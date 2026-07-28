import type { Types } from 'mongoose';
import { ParentProfileModel } from '../models/parent-profile.model';
import { NotFoundError } from '../../../../errors';
import type {
  CreateParentProfileInput,
  ParentRepository,
  UpdateNotificationPreferencesInput,
} from '../../../../modules/parent/parent.repository.interface';
import type { ParentProfile } from '../../../../modules/parent/parent.types';

function toParentProfile(doc: {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  verifiedStudentIds: Types.ObjectId[];
  notificationPreferences?: { email: boolean; sms: boolean } | null;
  createdAt: Date;
}): ParentProfile {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    verifiedStudentIds: doc.verifiedStudentIds.map((id) => id.toString()),
    notificationPreferences: {
      email: doc.notificationPreferences?.email ?? true,
      sms: doc.notificationPreferences?.sms ?? false,
    },
    createdAt: doc.createdAt,
  };
}

export class MongoParentRepository implements ParentRepository {
  async findById(id: string): Promise<ParentProfile | null> {
    const doc = await ParentProfileModel.findById(id).exec();
    return doc ? toParentProfile(doc) : null;
  }

  async findByUserId(userId: string): Promise<ParentProfile | null> {
    const doc = await ParentProfileModel.findOne({ userId }).exec();
    return doc ? toParentProfile(doc) : null;
  }

  async findByVerifiedStudentId(studentId: string): Promise<ParentProfile[]> {
    const docs = await ParentProfileModel.find({ verifiedStudentIds: studentId }).exec();
    return docs.map(toParentProfile);
  }

  async create(input: CreateParentProfileInput): Promise<ParentProfile> {
    const doc = await ParentProfileModel.create({ userId: input.userId });
    return toParentProfile(doc);
  }

  async addVerifiedStudent(parentId: string, studentId: string): Promise<void> {
    await ParentProfileModel.findByIdAndUpdate(parentId, {
      $addToSet: { verifiedStudentIds: studentId },
    }).exec();
  }

  async removeVerifiedStudent(parentId: string, studentId: string): Promise<void> {
    await ParentProfileModel.findByIdAndUpdate(parentId, {
      $pull: { verifiedStudentIds: studentId },
    }).exec();
  }

  async updateNotificationPreferences(
    parentId: string,
    patch: UpdateNotificationPreferencesInput,
  ): Promise<ParentProfile> {
    const update: Record<string, boolean> = {};
    if (patch.email !== undefined) update['notificationPreferences.email'] = patch.email;
    if (patch.sms !== undefined) update['notificationPreferences.sms'] = patch.sms;

    const doc = await ParentProfileModel.findByIdAndUpdate(parentId, update, { new: true }).exec();
    if (!doc) {
      throw new NotFoundError('Parent profile not found');
    }
    return toParentProfile(doc);
  }
}
