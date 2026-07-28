export type SchoolSubscriptionTier = 'trial' | 'standard' | 'premium';
export type ClassTier = 'foundation' | 'higher';

export interface SchoolAddress {
  line1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

/** Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.4). */
export interface School {
  id: string;
  name: string;
  address: SchoolAddress;
  subscriptionTier: SchoolSubscriptionTier;
  contactEmail: string;
  createdAt: Date;
}

/** Embedded, append-only — never mutate a past entry, close it with leftAt (DOMAIN_MODEL.md §2.4). */
export interface MembershipHistoryEntry {
  studentId: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface ClassGroup {
  id: string;
  schoolId: string;
  name: string;
  examBoard: string;
  tier: ClassTier;
  teacherIds: string[];
  /** Current roster — the only writer is teacher.service's enrollment flow (AD-011). */
  activeStudentIds: string[];
  membershipHistory: MembershipHistoryEntry[];
  academicYear: string;
  createdAt: Date;
}

/** Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.3). */
export interface TeacherProfile {
  id: string;
  userId: string;
  schoolId: string;
  classIds: string[];
  subjects: string[];
  createdAt: Date;
}
