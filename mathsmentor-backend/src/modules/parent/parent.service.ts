import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthService } from '../auth/auth.service';
import type { StudentService } from '../student/student.service';
import type { StudentProfile } from '../student/student.types';
import type {
  ParentRepository,
  UpdateNotificationPreferencesInput,
} from './parent.repository.interface';
import type { ParentProfile } from './parent.types';
import { PARENT_EVENTS } from './parent.events';

export interface ParentService {
  createProfile(userId: string): Promise<ParentProfile>;
  getByUserId(userId: string): Promise<ParentProfile>;
  /**
   * Verification placeholder: knowledge of the child's registered account
   * email is treated as sufficient proof of relationship. A real product
   * would want a double opt-in (student/school confirmation), which needs
   * Notification infra not yet built — documented in PROGRESS.md tech debt,
   * not silently assumed to be a finished trust/safety feature.
   */
  linkStudentByEmail(parentUserId: string, studentEmail: string): Promise<ParentProfile>;
  unlinkStudent(parentUserId: string, studentId: string): Promise<ParentProfile>;
  getChildren(parentUserId: string): Promise<StudentProfile[]>;
  getGuardiansForStudent(studentId: string): Promise<ParentProfile[]>;
  updateNotificationPreferences(
    parentUserId: string,
    patch: UpdateNotificationPreferencesInput,
  ): Promise<ParentProfile>;
}

export interface ParentServiceDeps {
  parentRepository: ParentRepository;
  authService: AuthService;
  studentService: StudentService;
  eventBus: EventBus;
}

export function createParentService(deps: ParentServiceDeps): ParentService {
  return {
    async createProfile(userId) {
      const existing = await deps.parentRepository.findByUserId(userId);
      if (existing) {
        throw new ConflictError('A parent profile already exists for this account');
      }
      return deps.parentRepository.create({ userId });
    },

    async getByUserId(userId) {
      const profile = await deps.parentRepository.findByUserId(userId);
      if (!profile) {
        throw new NotFoundError('Parent profile not found');
      }
      return profile;
    },

    /**
     * ParentProfile (owned by this module) owns link creation, then calls
     * student.service.addParentLink as the "commit" step for
     * StudentProfile.parentIds — the two-aggregate contract specified
     * verbatim in DOMAIN_MODEL.md §2.3. Not a distributed transaction; a
     * failure of the second write is background-reconciliation-job
     * territory (ARCHITECTURE.md §21.3), same as AD-011.
     */
    async linkStudentByEmail(parentUserId, studentEmail) {
      const parentProfile = await deps.parentRepository.findByUserId(parentUserId);
      if (!parentProfile) {
        throw new NotFoundError('Parent profile not found');
      }

      const studentUser = await deps.authService.findUserByEmail(studentEmail);
      if (!studentUser || studentUser.role !== 'student') {
        throw new NotFoundError('No student account found with that email');
      }
      const studentProfile = await deps.studentService.getByUserId(studentUser.id);

      if (parentProfile.verifiedStudentIds.includes(studentProfile.id)) {
        throw new ConflictError('This student is already linked to your account');
      }

      await deps.parentRepository.addVerifiedStudent(parentProfile.id, studentProfile.id);
      await deps.studentService.addParentLink(studentProfile.id, parentUserId);
      await deps.eventBus.publish(PARENT_EVENTS.StudentLinked, {
        parentId: parentProfile.id,
        studentId: studentProfile.id,
      });

      const updated = await deps.parentRepository.findByUserId(parentUserId);
      if (!updated) {
        throw new NotFoundError('Parent profile not found');
      }
      return updated;
    },

    async unlinkStudent(parentUserId, studentId) {
      const parentProfile = await deps.parentRepository.findByUserId(parentUserId);
      if (!parentProfile) {
        throw new NotFoundError('Parent profile not found');
      }
      if (!parentProfile.verifiedStudentIds.includes(studentId)) {
        throw new ValidationError('This student is not linked to your account');
      }

      await deps.parentRepository.removeVerifiedStudent(parentProfile.id, studentId);
      await deps.studentService.removeParentLink(studentId, parentUserId);
      await deps.eventBus.publish(PARENT_EVENTS.StudentUnlinked, {
        parentId: parentProfile.id,
        studentId,
      });

      const updated = await deps.parentRepository.findByUserId(parentUserId);
      if (!updated) {
        throw new NotFoundError('Parent profile not found');
      }
      return updated;
    },

    async getChildren(parentUserId) {
      return deps.studentService.getByParentId(parentUserId);
    },

    async getGuardiansForStudent(studentId) {
      return deps.parentRepository.findByVerifiedStudentId(studentId);
    },

    async updateNotificationPreferences(parentUserId, patch) {
      const profile = await deps.parentRepository.findByUserId(parentUserId);
      if (!profile) {
        throw new NotFoundError('Parent profile not found');
      }
      return deps.parentRepository.updateNotificationPreferences(profile.id, patch);
    },
  };
}
