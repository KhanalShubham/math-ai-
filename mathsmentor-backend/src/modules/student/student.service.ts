import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { ConflictError, NotFoundError } from '../../errors';
import type {
  CreateStudentProfileInput,
  StudentRepository,
  UpdateStudentProfileInput,
} from './student.repository.interface';
import type { StudentProfile } from './student.types';
import { STUDENT_EVENTS } from './student.events';

export interface StudentService {
  createProfile(input: CreateStudentProfileInput): Promise<StudentProfile>;
  getByUserId(userId: string): Promise<StudentProfile>;
  getByClassId(classId: string): Promise<StudentProfile[]>;
  getByParentId(parentId: string): Promise<StudentProfile[]>;
  updateProfile(userId: string, patch: UpdateStudentProfileInput): Promise<StudentProfile>;
  updateEstimatedGrade(studentId: string, grade: number): Promise<void>;
  addParentLink(studentId: string, parentUserId: string): Promise<void>;
}

export interface StudentServiceDeps {
  studentRepository: StudentRepository;
  eventBus: EventBus;
}

export function createStudentService(deps: StudentServiceDeps): StudentService {
  return {
    async createProfile(input) {
      const existing = await deps.studentRepository.findByUserId(input.userId);
      if (existing) {
        throw new ConflictError('A student profile already exists for this account');
      }

      const profile = await deps.studentRepository.create(input);
      await deps.eventBus.publish(STUDENT_EVENTS.StudentEnrolled, {
        studentId: profile.id,
        userId: profile.userId,
      });

      return profile;
    },

    async getByUserId(userId) {
      const profile = await deps.studentRepository.findByUserId(userId);
      if (!profile) {
        throw new NotFoundError('Student profile not found');
      }
      return profile;
    },

    async getByClassId(classId) {
      return deps.studentRepository.findByClassId(classId);
    },

    async getByParentId(parentId) {
      return deps.studentRepository.findByParentId(parentId);
    },

    async updateProfile(userId, patch) {
      const existing = await deps.studentRepository.findByUserId(userId);
      if (!existing) {
        throw new NotFoundError('Student profile not found');
      }
      return deps.studentRepository.updateProfile(existing.id, patch);
    },

    async updateEstimatedGrade(studentId, grade) {
      await deps.studentRepository.updateEstimatedGrade(studentId, grade);
      await deps.eventBus.publish(STUDENT_EVENTS.StudentGradeEstimateChanged, {
        studentId,
        grade,
      });
    },

    async addParentLink(studentId, parentUserId) {
      await deps.studentRepository.addParentLink(studentId, parentUserId);
    },
  };
}
