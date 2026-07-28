import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { StudentService } from '../student/student.service';
import type {
  ClassGroupRepository,
  CreateClassGroupInput,
  CreateSchoolInput,
  CreateTeacherProfileInput,
  SchoolRepository,
  TeacherProfileRepository,
} from './teacher.repository.interface';
import type { ClassGroup, School, TeacherProfile } from './teacher.types';
import { TEACHER_EVENTS } from './teacher.events';

export interface TeacherService {
  createProfile(input: CreateTeacherProfileInput): Promise<TeacherProfile>;
  getByUserId(userId: string): Promise<TeacherProfile>;
  createSchool(input: CreateSchoolInput): Promise<School>;
  getSchool(id: string): Promise<School>;
  createClass(input: CreateClassGroupInput, creatingTeacherUserId?: string): Promise<ClassGroup>;
  addTeacherToClass(classId: string, teacherUserId: string): Promise<void>;
  getClass(id: string): Promise<ClassGroup>;
  listClassesForTeacher(teacherUserId: string): Promise<ClassGroup[]>;
  listClassesForSchool(schoolId: string): Promise<ClassGroup[]>;
  enrollStudent(classId: string, studentId: string): Promise<ClassGroup>;
  withdrawStudent(classId: string, studentId: string): Promise<ClassGroup>;
}

export interface TeacherServiceDeps {
  teacherProfileRepository: TeacherProfileRepository;
  schoolRepository: SchoolRepository;
  classGroupRepository: ClassGroupRepository;
  studentService: StudentService;
  eventBus: EventBus;
}

export function createTeacherService(deps: TeacherServiceDeps): TeacherService {
  return {
    async createProfile(input) {
      const existing = await deps.teacherProfileRepository.findByUserId(input.userId);
      if (existing) {
        throw new ConflictError('A teacher profile already exists for this account');
      }
      const school = await deps.schoolRepository.findById(input.schoolId);
      if (!school) {
        throw new NotFoundError('School not found');
      }
      return deps.teacherProfileRepository.create(input);
    },

    async getByUserId(userId) {
      const profile = await deps.teacherProfileRepository.findByUserId(userId);
      if (!profile) {
        throw new NotFoundError('Teacher profile not found');
      }
      return profile;
    },

    async createSchool(input) {
      return deps.schoolRepository.create(input);
    },

    async getSchool(id) {
      const school = await deps.schoolRepository.findById(id);
      if (!school) {
        throw new NotFoundError('School not found');
      }
      return school;
    },

    async createClass(input, creatingTeacherUserId) {
      const school = await deps.schoolRepository.findById(input.schoolId);
      if (!school) {
        throw new NotFoundError('School not found');
      }

      const classGroup = await deps.classGroupRepository.create(input);
      if (!creatingTeacherUserId) {
        return classGroup;
      }

      const teacherProfile = await deps.teacherProfileRepository.findByUserId(
        creatingTeacherUserId,
      );
      if (!teacherProfile) {
        throw new NotFoundError('Teacher profile not found');
      }
      await deps.classGroupRepository.addTeacher(classGroup.id, creatingTeacherUserId);
      await deps.teacherProfileRepository.addClassLink(teacherProfile.id, classGroup.id);

      const updated = await deps.classGroupRepository.findById(classGroup.id);
      if (!updated) {
        throw new NotFoundError('Class not found');
      }
      return updated;
    },

    async addTeacherToClass(classId, teacherUserId) {
      const classGroup = await deps.classGroupRepository.findById(classId);
      if (!classGroup) {
        throw new NotFoundError('Class not found');
      }
      const teacherProfile = await deps.teacherProfileRepository.findByUserId(teacherUserId);
      if (!teacherProfile) {
        throw new NotFoundError('Teacher profile not found');
      }
      if (classGroup.teacherIds.includes(teacherUserId)) {
        throw new ConflictError('Teacher is already assigned to this class');
      }

      await deps.classGroupRepository.addTeacher(classId, teacherUserId);
      await deps.teacherProfileRepository.addClassLink(teacherProfile.id, classId);
    },

    async getClass(id) {
      const classGroup = await deps.classGroupRepository.findById(id);
      if (!classGroup) {
        throw new NotFoundError('Class not found');
      }
      return classGroup;
    },

    async listClassesForTeacher(teacherUserId) {
      return deps.classGroupRepository.findByTeacher(teacherUserId);
    },

    async listClassesForSchool(schoolId) {
      return deps.classGroupRepository.findBySchool(schoolId);
    },

    /**
     * AD-011: ClassGroup (owned by this module) owns the enrollment action —
     * it writes activeStudentIds/membershipHistory first, then calls
     * student.service.addClassLink as the "commit" step for
     * StudentProfile.classIds. Mirrors the parent-link contract in
     * DOMAIN_MODEL.md §2.3 exactly; not a distributed transaction — if the
     * second write fails, that's background-reconciliation-job territory
     * (ARCHITECTURE.md §21.3), same as the parent-link case.
     */
    async enrollStudent(classId, studentId) {
      const classGroup = await deps.classGroupRepository.findById(classId);
      if (!classGroup) {
        throw new NotFoundError('Class not found');
      }
      if (classGroup.activeStudentIds.includes(studentId)) {
        throw new ConflictError('Student is already enrolled in this class');
      }
      await deps.studentService.getById(studentId);

      const updated = await deps.classGroupRepository.enrollStudent(
        classId,
        studentId,
        new Date(),
      );
      await deps.studentService.addClassLink(studentId, classId);
      await deps.eventBus.publish(TEACHER_EVENTS.StudentEnrolledInClass, { studentId, classId });

      return updated;
    },

    async withdrawStudent(classId, studentId) {
      const classGroup = await deps.classGroupRepository.findById(classId);
      if (!classGroup) {
        throw new NotFoundError('Class not found');
      }
      if (!classGroup.activeStudentIds.includes(studentId)) {
        throw new ValidationError('Student is not currently enrolled in this class');
      }

      const updated = await deps.classGroupRepository.withdrawStudent(
        classId,
        studentId,
        new Date(),
      );
      await deps.studentService.removeClassLink(studentId, classId);
      await deps.eventBus.publish(TEACHER_EVENTS.StudentWithdrawnFromClass, {
        studentId,
        classId,
      });

      return updated;
    },
  };
}
