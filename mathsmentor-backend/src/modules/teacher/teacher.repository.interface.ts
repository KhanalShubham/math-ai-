import type {
  ClassGroup,
  ClassTier,
  School,
  SchoolAddress,
  SchoolSubscriptionTier,
  TeacherProfile,
} from './teacher.types';

export interface CreateTeacherProfileInput {
  userId: string;
  schoolId: string;
  subjects: string[];
}

/**
 * Owned by this module (ARCHITECTURE.md §21.2; DOMAIN_MODEL.md §2.3).
 */
export interface TeacherProfileRepository {
  findById(id: string): Promise<TeacherProfile | null>;
  findByUserId(userId: string): Promise<TeacherProfile | null>;
  create(input: CreateTeacherProfileInput): Promise<TeacherProfile>;
  addClassLink(teacherId: string, classId: string): Promise<void>;
}

export interface CreateSchoolInput {
  name: string;
  address: SchoolAddress;
  subscriptionTier: SchoolSubscriptionTier;
  contactEmail: string;
}

/** Owned by this module (DOMAIN_MODEL.md §2.4). */
export interface SchoolRepository {
  findById(id: string): Promise<School | null>;
  create(input: CreateSchoolInput): Promise<School>;
}

export interface CreateClassGroupInput {
  schoolId: string;
  name: string;
  examBoard: string;
  tier: ClassTier;
  academicYear: string;
}

/**
 * Owned by this module (DOMAIN_MODEL.md §2.4). enrollStudent/withdrawStudent
 * are the ONLY write paths for activeStudentIds/membershipHistory — the
 * append-only history rule (never mutate a past entry, close with leftAt) is
 * enforced here, not left to callers.
 */
export interface ClassGroupRepository {
  findById(id: string): Promise<ClassGroup | null>;
  findBySchool(schoolId: string): Promise<ClassGroup[]>;
  findByTeacher(teacherUserId: string): Promise<ClassGroup[]>;
  create(input: CreateClassGroupInput): Promise<ClassGroup>;
  addTeacher(classId: string, teacherUserId: string): Promise<void>;
  /** Appends a new open membershipHistory entry and adds to activeStudentIds. */
  enrollStudent(classId: string, studentId: string, joinedAt: Date): Promise<ClassGroup>;
  /** Closes the student's open membershipHistory entry with leftAt and removes from activeStudentIds. */
  withdrawStudent(classId: string, studentId: string, leftAt: Date): Promise<ClassGroup>;
}
