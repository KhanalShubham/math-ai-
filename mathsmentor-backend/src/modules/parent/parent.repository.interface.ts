import type { ParentProfile } from './parent.types';

export interface CreateParentProfileInput {
  userId: string;
}

export interface UpdateNotificationPreferencesInput {
  email?: boolean;
  sms?: boolean;
}

/**
 * Owned by this module (ARCHITECTURE.md §21.2; DOMAIN_MODEL.md §2.3).
 * addVerifiedStudent/removeVerifiedStudent are the ONLY write paths for
 * verifiedStudentIds, called exclusively from parent.service's link/unlink
 * flow — never from a controller directly (same pattern as
 * student.repository's addClassLink/addParentLink).
 */
export interface ParentRepository {
  findById(id: string): Promise<ParentProfile | null>;
  findByUserId(userId: string): Promise<ParentProfile | null>;
  findByVerifiedStudentId(studentId: string): Promise<ParentProfile[]>;
  create(input: CreateParentProfileInput): Promise<ParentProfile>;
  addVerifiedStudent(parentId: string, studentId: string): Promise<void>;
  removeVerifiedStudent(parentId: string, studentId: string): Promise<void>;
  updateNotificationPreferences(
    parentId: string,
    patch: UpdateNotificationPreferencesInput,
  ): Promise<ParentProfile>;
}
