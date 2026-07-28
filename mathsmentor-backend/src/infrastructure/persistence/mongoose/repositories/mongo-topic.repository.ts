import type { Types } from 'mongoose';
import { TopicModel } from '../models/topic.model';
import type {
  CreateTopicInput,
  TopicFilter,
  TopicRepository,
} from '../../../../modules/curriculum/curriculum.repository.interface';
import type { Topic } from '../../../../modules/curriculum/curriculum.types';

function toTopic(doc: {
  _id: Types.ObjectId;
  name: string;
  examBoard: string;
  tier: Topic['tier'];
  gradeBand: number[];
  prerequisiteTopicIds: Types.ObjectId[];
  status: Topic['status'];
  createdAt: Date;
}): Topic {
  return {
    id: doc._id.toString(),
    name: doc.name,
    examBoard: doc.examBoard,
    tier: doc.tier,
    gradeBand: doc.gradeBand,
    prerequisiteTopicIds: doc.prerequisiteTopicIds.map((id) => id.toString()),
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

export class MongoTopicRepository implements TopicRepository {
  async findById(id: string): Promise<Topic | null> {
    const doc = await TopicModel.findById(id).exec();
    return doc ? toTopic(doc) : null;
  }

  async findMany(filter: TopicFilter): Promise<Topic[]> {
    const query: Record<string, unknown> = {};
    if (filter.examBoard) query.examBoard = filter.examBoard;
    if (filter.tier) query.tier = filter.tier;
    if (filter.gradeBand !== undefined) query.gradeBand = filter.gradeBand;
    if (filter.status) query.status = filter.status;

    const docs = await TopicModel.find(query).exec();
    return docs.map(toTopic);
  }

  async create(input: CreateTopicInput): Promise<Topic> {
    const doc = await TopicModel.create({
      name: input.name,
      examBoard: input.examBoard,
      tier: input.tier,
      gradeBand: input.gradeBand,
    });
    return toTopic(doc);
  }

  async addPrerequisiteLink(topicId: string, prerequisiteTopicId: string): Promise<void> {
    await TopicModel.findByIdAndUpdate(topicId, {
      $addToSet: { prerequisiteTopicIds: prerequisiteTopicId },
    }).exec();
  }

  async publish(id: string): Promise<void> {
    await TopicModel.findByIdAndUpdate(id, { status: 'published' }).exec();
  }
}
