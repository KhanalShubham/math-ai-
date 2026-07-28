import type { Types } from 'mongoose';
import { QuestionModel } from '../models/question.model';
import type {
  CreateQuestionInput,
  QuestionRepository,
  QuestionSelectionFilter,
} from '../../../../modules/curriculum/curriculum.repository.interface';
import type {
  AnswerKey,
  PublicQuestion,
  Question,
} from '../../../../modules/curriculum/curriculum.types';

type QuestionDoc = {
  _id: Types.ObjectId;
  topicId: Types.ObjectId;
  type: Question['type'];
  difficulty: number;
  promptText: string;
  promptAssets: Question['promptAssets'];
  markScheme?: Question['markScheme'] | null;
  tags: string[];
  status: Question['status'];
  createdAt: Date;
};

function toPublicQuestion(doc: QuestionDoc): PublicQuestion {
  return {
    id: doc._id.toString(),
    topicId: doc.topicId.toString(),
    type: doc.type,
    difficulty: doc.difficulty,
    promptText: doc.promptText,
    promptAssets: doc.promptAssets,
    markScheme: doc.markScheme ?? null,
    tags: doc.tags,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

function toQuestion(doc: QuestionDoc & { answerKey: AnswerKey }): Question {
  return { ...toPublicQuestion(doc), answerKey: doc.answerKey };
}

export class MongoQuestionRepository implements QuestionRepository {
  /** Internal use only — the only repository method that ever selects answerKey. */
  async findById(id: string): Promise<Question | null> {
    const doc = await QuestionModel.findById(id).select('+answerKey').exec();
    return doc ? toQuestion(doc) : null;
  }

  async findPublicById(id: string): Promise<PublicQuestion | null> {
    const doc = await QuestionModel.findById(id).exec();
    return doc ? toPublicQuestion(doc) : null;
  }

  async findForTopic(filter: QuestionSelectionFilter): Promise<PublicQuestion[]> {
    const difficulty: Record<string, number> = {};
    if (filter.minDifficulty !== undefined) difficulty.$gte = filter.minDifficulty;
    if (filter.maxDifficulty !== undefined) difficulty.$lte = filter.maxDifficulty;

    const query: Record<string, unknown> = { topicId: filter.topicId, status: 'published' };
    if (Object.keys(difficulty).length > 0) query.difficulty = difficulty;

    const docs = await QuestionModel.find(query)
      .limit(filter.limit ?? 20)
      .exec();
    return docs.map(toPublicQuestion);
  }

  async create(input: CreateQuestionInput): Promise<Question> {
    const doc = await QuestionModel.create({
      topicId: input.topicId,
      type: input.type,
      difficulty: input.difficulty,
      promptText: input.promptText,
      promptAssets: input.promptAssets ?? [],
      answerKey: input.answerKey,
      markScheme: input.markScheme ?? null,
      tags: input.tags ?? [],
    });
    return toQuestion({ ...doc.toObject(), answerKey: input.answerKey });
  }

  async publish(id: string): Promise<void> {
    await QuestionModel.findByIdAndUpdate(id, { status: 'published' }).exec();
  }

  async retire(id: string): Promise<void> {
    await QuestionModel.findByIdAndUpdate(id, { status: 'retired' }).exec();
  }
}
