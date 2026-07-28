import type { ExamBoard, StudentProfile, StudentTier } from './student.types';

export interface CreateStudentProfileInput {
  userId: string;
  displayName: string;
  dateOfBirth: Date;
  examBoard: ExamBoard;
  tier: StudentTier;
  targetGrade?: number;
}

export interface UpdateStudentProfileInput {
  displayName?: string;
  examBoard?: ExamBoard;
  tier?: StudentTier;
  targetGrade?: number;
  onboardingCompletedAt?: Date;
}

/**
 * Owned by this module (ARCHITECTURE.md §21.2; DOMAIN_MODEL.md §2.2). The
 * Mongoose implementation lives in infrastructure/persistence/mongoose/ —
 * student.service depends on this interface only, never on Mongoose.
 *
 * currentEstimatedGrade has no place in UpdateStudentProfileInput — the only
 * write path for it is updateEstimatedGrade, called exclusively from the
 * mastery event handler, never from student.controller.
 */
export interface StudentRepository {
  findById(id: string): Promise<StudentProfile | null>;
  findByUserId(userId: string): Promise<StudentProfile | null>;
  findByClassId(classId: string): Promise<StudentProfile[]>;
  findByParentId(parentId: string): Promise<StudentProfile[]>;
  create(input: CreateStudentProfileInput): Promise<StudentProfile>;
  updateProfile(studentId: string, patch: UpdateStudentProfileInput): Promise<StudentProfile>;
  updateEstimatedGrade(studentId: string, grade: number): Promise<void>;
  addParentLink(studentId: string, parentUserId: string): Promise<void>;
}
