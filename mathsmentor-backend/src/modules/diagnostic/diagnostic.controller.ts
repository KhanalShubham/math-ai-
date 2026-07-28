import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { StudentService } from '../student/student.service';
import type { DiagnosticService } from './diagnostic.service';
import type { AttemptIdParam, SubmitItemInput } from './diagnostic.validation';

export function createDiagnosticController(
  diagnosticService: DiagnosticService,
  studentService: StudentService,
) {
  return {
    start: asyncHandler(async (req: Request, res: Response) => {
      const profile = await studentService.getByUserId(req.user!.sub);
      const { attempt, nextQuestion } = await diagnosticService.startAttempt(
        profile.id,
        profile.examBoard,
        profile.tier,
      );
      res.status(201).json({ attempt, nextQuestion });
    }),

    getCurrent: asyncHandler(async (req: Request, res: Response) => {
      const profile = await studentService.getByUserId(req.user!.sub);
      const attempt = await diagnosticService.getCurrentAttempt(profile.id);
      res.status(200).json({ attempt });
    }),

    listMine: asyncHandler(async (req: Request, res: Response) => {
      const profile = await studentService.getByUserId(req.user!.sub);
      const attempts = await diagnosticService.listAttempts(profile.id);
      res.status(200).json({ attempts });
    }),

    get: asyncHandler(async (req: Request, res: Response) => {
      const { attemptId } = req.params as unknown as AttemptIdParam;
      const profile = await studentService.getByUserId(req.user!.sub);
      const attempt = await diagnosticService.getAttempt(attemptId, profile.id);
      res.status(200).json({ attempt });
    }),

    submitItem: asyncHandler(async (req: Request, res: Response) => {
      const { attemptId } = req.params as unknown as AttemptIdParam;
      const input = req.body as SubmitItemInput;
      const profile = await studentService.getByUserId(req.user!.sub);

      const { attempt, isCorrect, nextQuestion } = await diagnosticService.submitItem(
        attemptId,
        profile.id,
        {
          questionId: input.questionId,
          studentAnswer: input.studentAnswer,
          timeTakenMs: input.timeTakenMs,
          hintRequested: input.hintRequested,
        },
        profile.examBoard,
        profile.tier,
      );
      res.status(200).json({ attempt, isCorrect, nextQuestion });
    }),

    complete: asyncHandler(async (req: Request, res: Response) => {
      const { attemptId } = req.params as unknown as AttemptIdParam;
      const profile = await studentService.getByUserId(req.user!.sub);
      const attempt = await diagnosticService.completeAttempt(attemptId, profile.id);
      res.status(200).json({ attempt });
    }),
  };
}
