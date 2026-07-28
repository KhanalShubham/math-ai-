import type { Request, Response } from 'express';
import { AuthorizationError } from '../../errors';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { StudentService } from './student.service';
import type { MasteryService } from './mastery.service';
import type {
  ClassIdParam,
  CreateStudentProfileInput,
  ParentIdParam,
  UpdateStudentProfileInput,
} from './student.validation';
import type { StudentProfile } from './student.types';

function toPublicProfile(profile: StudentProfile) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    examBoard: profile.examBoard,
    tier: profile.tier,
    targetGrade: profile.targetGrade,
    currentEstimatedGrade: profile.currentEstimatedGrade,
    classIds: profile.classIds,
    onboardingCompletedAt: profile.onboardingCompletedAt,
  };
}

export function createStudentController(
  studentService: StudentService,
  masteryService: MasteryService,
) {
  return {
    createMyProfile: asyncHandler(async (req: Request, res: Response) => {
      const input = req.body as CreateStudentProfileInput;
      // requireAuth guarantees req.user here — see student.routes.ts.
      const profile = await studentService.createProfile({ ...input, userId: req.user!.sub });
      res.status(201).json({ student: toPublicProfile(profile) });
    }),

    getMyProfile: asyncHandler(async (req: Request, res: Response) => {
      const profile = await studentService.getByUserId(req.user!.sub);
      res.status(200).json({ student: toPublicProfile(profile) });
    }),

    updateMyProfile: asyncHandler(async (req: Request, res: Response) => {
      const patch = req.body as UpdateStudentProfileInput;
      const profile = await studentService.updateProfile(req.user!.sub, patch);
      res.status(200).json({ student: toPublicProfile(profile) });
    }),

    listByClass: asyncHandler(async (req: Request, res: Response) => {
      const { classId } = req.params as unknown as ClassIdParam;
      const students = await studentService.getByClassId(classId);
      res.status(200).json({ students: students.map(toPublicProfile) });
    }),

    listByParent: asyncHandler(async (req: Request, res: Response) => {
      const { parentId } = req.params as unknown as ParentIdParam;
      if (req.user!.role !== 'admin' && req.user!.sub !== parentId) {
        throw new AuthorizationError('You may only view your own linked students');
      }
      const students = await studentService.getByParentId(parentId);
      res.status(200).json({ students: students.map(toPublicProfile) });
    }),

    getMyMastery: asyncHandler(async (req: Request, res: Response) => {
      const profile = await studentService.getByUserId(req.user!.sub);
      const mastery = await masteryService.getByStudent(profile.id);
      res.status(200).json({ mastery });
    }),
  };
}
