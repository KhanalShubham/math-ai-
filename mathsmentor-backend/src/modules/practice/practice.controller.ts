import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { StudentService } from '../student/student.service';
import type { PracticeService } from './practice.service';
import type {
  SessionIdParam,
  StartSessionInput,
  SubmitPracticeItemInput,
} from './practice.validation';

export function createPracticeController(
  practiceService: PracticeService,
  studentService: StudentService,
) {
  return {
    start: asyncHandler(async (req: Request, res: Response) => {
      const { source, topicIds } = req.body as StartSessionInput;
      const profile = await studentService.getByUserId(req.user!.sub);
      const session = await practiceService.startSession(profile.id, source, topicIds);
      res.status(201).json({ session });
    }),

    getCurrent: asyncHandler(async (req: Request, res: Response) => {
      const profile = await studentService.getByUserId(req.user!.sub);
      const session = await practiceService.getCurrentSession(profile.id);
      res.status(200).json({ session });
    }),

    listMine: asyncHandler(async (req: Request, res: Response) => {
      const profile = await studentService.getByUserId(req.user!.sub);
      const sessions = await practiceService.listSessions(profile.id);
      res.status(200).json({ sessions });
    }),

    get: asyncHandler(async (req: Request, res: Response) => {
      const { sessionId } = req.params as unknown as SessionIdParam;
      const profile = await studentService.getByUserId(req.user!.sub);
      const session = await practiceService.getSession(sessionId, profile.id);
      res.status(200).json({ session });
    }),

    submitItem: asyncHandler(async (req: Request, res: Response) => {
      const { sessionId } = req.params as unknown as SessionIdParam;
      const input = req.body as SubmitPracticeItemInput;
      const profile = await studentService.getByUserId(req.user!.sub);

      const { session, isCorrect } = await practiceService.submitItem(sessionId, profile.id, {
        questionId: input.questionId,
        studentAnswer: input.studentAnswer,
        timeTakenMs: input.timeTakenMs,
        hintsUsedCount: input.hintsUsedCount,
      });
      res.status(200).json({ session, isCorrect });
    }),

    complete: asyncHandler(async (req: Request, res: Response) => {
      const { sessionId } = req.params as unknown as SessionIdParam;
      const profile = await studentService.getByUserId(req.user!.sub);
      const session = await practiceService.completeSession(sessionId, profile.id);
      res.status(200).json({ session });
    }),
  };
}
