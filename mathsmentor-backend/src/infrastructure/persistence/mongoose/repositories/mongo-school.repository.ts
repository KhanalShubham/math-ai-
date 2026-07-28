import type { Types } from 'mongoose';
import { SchoolModel } from '../models/school.model';
import type {
  CreateSchoolInput,
  SchoolRepository,
} from '../../../../modules/teacher/teacher.repository.interface';
import type { School } from '../../../../modules/teacher/teacher.types';

function toSchool(doc: {
  _id: Types.ObjectId;
  name: string;
  address?: {
    line1?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  subscriptionTier: School['subscriptionTier'];
  contactEmail: string;
  createdAt: Date;
}): School {
  return {
    id: doc._id.toString(),
    name: doc.name,
    address: {
      line1: doc.address?.line1 ?? undefined,
      city: doc.address?.city ?? undefined,
      postalCode: doc.address?.postalCode ?? undefined,
      country: doc.address?.country ?? undefined,
    },
    subscriptionTier: doc.subscriptionTier,
    contactEmail: doc.contactEmail,
    createdAt: doc.createdAt,
  };
}

export class MongoSchoolRepository implements SchoolRepository {
  async findById(id: string): Promise<School | null> {
    const doc = await SchoolModel.findById(id).exec();
    return doc ? toSchool(doc) : null;
  }

  async create(input: CreateSchoolInput): Promise<School> {
    const doc = await SchoolModel.create({
      name: input.name,
      address: input.address,
      subscriptionTier: input.subscriptionTier,
      contactEmail: input.contactEmail,
    });
    return toSchool(doc);
  }
}
