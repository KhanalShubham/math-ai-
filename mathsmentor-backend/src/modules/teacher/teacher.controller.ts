import type { Request, Response } from 'express';
import { AuthorizationError } from '../../errors';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { TeacherService } from './teacher.service';
import type { ClassGroup } from './teacher.types';
import type {
  AddTeacherToClassInput,
  ClassAndStudentIdParam,
  ClassIdParam,
  CreateClassGroupInput,
  CreateSchoolInput,
  CreateTeacherProfileInput,
  EnrollStudentInput,
  SchoolIdParam,
} from './teacher.validation';

/** Admins may act on any class; a teacher may only act on classes they're assigned to. */
function assertCanManageClass(req: Request, classGroup: ClassGroup): void {
  if (req.user!.role === 'admin') return;
  if (!classGroup.teacherIds.includes(req.user!.sub)) {
    throw new AuthorizationError('You are not assigned to this class');
  }
}

export function createTeacherController(teacherService: TeacherService) {
  return {
    createMyProfile: asyncHandler(async (req: Request, res: Response) => {
      const input = req.body as CreateTeacherProfileInput;
      const profile = await teacherService.createProfile({ ...input, userId: req.user!.sub });
      res.status(201).json({ teacher: profile });
    }),

    getMyProfile: asyncHandler(async (req: Request, res: Response) => {
      const profile = await teacherService.getByUserId(req.user!.sub);
      res.status(200).json({ teacher: profile });
    }),

    createSchool: asyncHandler(async (req: Request, res: Response) => {
      const input = req.body as CreateSchoolInput;
      const school = await teacherService.createSchool(input);
      res.status(201).json({ school });
    }),

    getSchool: asyncHandler(async (req: Request, res: Response) => {
      const { schoolId } = req.params as unknown as SchoolIdParam;
      const school = await teacherService.getSchool(schoolId);
      res.status(200).json({ school });
    }),

    createClass: asyncHandler(async (req: Request, res: Response) => {
      const input = req.body as CreateClassGroupInput;
      const creatingTeacherUserId = req.user!.role === 'teacher' ? req.user!.sub : undefined;
      const classGroup = await teacherService.createClass(input, creatingTeacherUserId);
      res.status(201).json({ class: classGroup });
    }),

    getClass: asyncHandler(async (req: Request, res: Response) => {
      const { classId } = req.params as unknown as ClassIdParam;
      const classGroup = await teacherService.getClass(classId);
      res.status(200).json({ class: classGroup });
    }),

    listMyClasses: asyncHandler(async (req: Request, res: Response) => {
      const classes = await teacherService.listClassesForTeacher(req.user!.sub);
      res.status(200).json({ classes });
    }),

    addTeacherToClass: asyncHandler(async (req: Request, res: Response) => {
      const { classId } = req.params as unknown as ClassIdParam;
      const { teacherUserId } = req.body as AddTeacherToClassInput;
      await teacherService.addTeacherToClass(classId, teacherUserId);
      res.status(200).json({ message: 'Teacher added to class' });
    }),

    enrollStudent: asyncHandler(async (req: Request, res: Response) => {
      const { classId } = req.params as unknown as ClassIdParam;
      const { studentId } = req.body as EnrollStudentInput;
      const classGroup = await teacherService.getClass(classId);
      assertCanManageClass(req, classGroup);

      const updated = await teacherService.enrollStudent(classId, studentId);
      res.status(200).json({ class: updated });
    }),

    withdrawStudent: asyncHandler(async (req: Request, res: Response) => {
      const { classId, studentId } = req.params as unknown as ClassAndStudentIdParam;
      const classGroup = await teacherService.getClass(classId);
      assertCanManageClass(req, classGroup);

      const updated = await teacherService.withdrawStudent(classId, studentId);
      res.status(200).json({ class: updated });
    }),
  };
}
