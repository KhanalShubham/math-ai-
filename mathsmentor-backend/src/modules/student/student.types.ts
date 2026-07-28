export type ExamBoard = 'AQA' | 'Edexcel' | 'OCR' | 'WJEC';
export type StudentTier = 'foundation' | 'higher';

/** Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.2). */
export interface StudentProfile {
  id: string;
  userId: string;
  displayName: string;
  dateOfBirth: Date;
  examBoard: ExamBoard;
  tier: StudentTier;
  targetGrade: number | null;
  /** Written only by the mastery event handler via updateEstimatedGrade — never by a direct profile edit. */
  currentEstimatedGrade: number | null;
  classIds: string[];
  parentIds: string[];
  onboardingCompletedAt: Date | null;
  createdAt: Date;
}
