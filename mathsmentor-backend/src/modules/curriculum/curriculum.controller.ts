import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { QuestionService, TopicService } from './curriculum.service';
import type { Question } from './curriculum.types';
import type {
  AddPrerequisiteInput,
  CreateQuestionInput,
  CreateTopicInput,
  ListQuestionsQuery,
  ListTopicsQuery,
  QuestionIdParam,
  TopicIdParam,
} from './curriculum.validation';

/** Strips answerKey — every route except getInternal (admin-only) must use this. */
function toPublicQuestion(question: Question) {
  const { answerKey: _answerKey, ...rest } = question;
  return rest;
}

export function createTopicController(topicService: TopicService) {
  return {
    create: asyncHandler(async (req: Request, res: Response) => {
      const input = req.body as CreateTopicInput;
      const topic = await topicService.createTopic(input);
      res.status(201).json({ topic });
    }),

    get: asyncHandler(async (req: Request, res: Response) => {
      const { topicId } = req.params as unknown as TopicIdParam;
      const topic = await topicService.getTopic(topicId);
      res.status(200).json({ topic });
    }),

    list: asyncHandler(async (req: Request, res: Response) => {
      const filter = req.query as unknown as ListTopicsQuery;
      const topics = await topicService.listTopics(filter);
      res.status(200).json({ topics });
    }),

    addPrerequisite: asyncHandler(async (req: Request, res: Response) => {
      const { topicId } = req.params as unknown as TopicIdParam;
      const { prerequisiteTopicId } = req.body as AddPrerequisiteInput;
      await topicService.addPrerequisite(topicId, prerequisiteTopicId);
      res.status(200).json({ message: 'Prerequisite added' });
    }),

    publish: asyncHandler(async (req: Request, res: Response) => {
      const { topicId } = req.params as unknown as TopicIdParam;
      await topicService.publishTopic(topicId);
      res.status(200).json({ message: 'Topic published' });
    }),
  };
}

export function createQuestionController(questionService: QuestionService) {
  return {
    create: asyncHandler(async (req: Request, res: Response) => {
      const input = req.body as CreateQuestionInput;
      const question = await questionService.createQuestion(input);
      res.status(201).json({ question: toPublicQuestion(question) });
    }),

    getInternal: asyncHandler(async (req: Request, res: Response) => {
      const { questionId } = req.params as unknown as QuestionIdParam;
      const question = await questionService.getQuestion(questionId);
      res.status(200).json({ question });
    }),

    getPublic: asyncHandler(async (req: Request, res: Response) => {
      const { questionId } = req.params as unknown as QuestionIdParam;
      const question = await questionService.getPublicQuestion(questionId);
      res.status(200).json({ question });
    }),

    listForTopic: asyncHandler(async (req: Request, res: Response) => {
      const filter = req.query as unknown as ListQuestionsQuery;
      const questions = await questionService.listForTopic(filter);
      res.status(200).json({ questions });
    }),

    publish: asyncHandler(async (req: Request, res: Response) => {
      const { questionId } = req.params as unknown as QuestionIdParam;
      await questionService.publishQuestion(questionId);
      res.status(200).json({ message: 'Question published' });
    }),

    retire: asyncHandler(async (req: Request, res: Response) => {
      const { questionId } = req.params as unknown as QuestionIdParam;
      await questionService.retireQuestion(questionId);
      res.status(200).json({ message: 'Question retired' });
    }),
  };
}
