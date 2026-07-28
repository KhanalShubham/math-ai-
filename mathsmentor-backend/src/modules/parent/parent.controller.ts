import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { ParentService } from './parent.service';
import type {
  LinkStudentInput,
  StudentIdParam,
  UpdateNotificationPreferencesInput,
} from './parent.validation';

export function createParentController(parentService: ParentService) {
  return {
    createMyProfile: asyncHandler(async (req: Request, res: Response) => {
      const profile = await parentService.createProfile(req.user!.sub);
      res.status(201).json({ parent: profile });
    }),

    getMyProfile: asyncHandler(async (req: Request, res: Response) => {
      const profile = await parentService.getByUserId(req.user!.sub);
      res.status(200).json({ parent: profile });
    }),

    linkStudent: asyncHandler(async (req: Request, res: Response) => {
      const { studentEmail } = req.body as LinkStudentInput;
      const profile = await parentService.linkStudentByEmail(req.user!.sub, studentEmail);
      res.status(200).json({ parent: profile });
    }),

    unlinkStudent: asyncHandler(async (req: Request, res: Response) => {
      const { studentId } = req.params as unknown as StudentIdParam;
      const profile = await parentService.unlinkStudent(req.user!.sub, studentId);
      res.status(200).json({ parent: profile });
    }),

    getMyChildren: asyncHandler(async (req: Request, res: Response) => {
      const children = await parentService.getChildren(req.user!.sub);
      res.status(200).json({ children });
    }),

    getGuardiansForStudent: asyncHandler(async (req: Request, res: Response) => {
      const { studentId } = req.params as unknown as StudentIdParam;
      const guardians = await parentService.getGuardiansForStudent(studentId);
      res.status(200).json({ guardians });
    }),

    updateMyNotificationPreferences: asyncHandler(async (req: Request, res: Response) => {
      const patch = req.body as UpdateNotificationPreferencesInput;
      const profile = await parentService.updateNotificationPreferences(req.user!.sub, patch);
      res.status(200).json({ parent: profile });
    }),
  };
}
