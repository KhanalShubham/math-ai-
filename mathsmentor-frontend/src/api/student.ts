import { apiRequest } from './client';

export type ExamBoard = 'AQA' | 'Edexcel' | 'OCR' | 'WJEC';
export type StudentTier = 'foundation' | 'higher';

export interface StudentProfile {
  id: string;
  displayName: string;
  examBoard: ExamBoard;
  tier: StudentTier;
  targetGrade: number | null;
  currentEstimatedGrade: number | null;
  classIds: string[];
  onboardingCompletedAt: string | null;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string | null;
}

export interface MasteryRecord {
  id: string;
  studentId: string;
  topicId: string;
  masteryScore: number;
  attemptsCount: number;
  correctCount: number;
  lastPracticedAt: string;
  trend: 'improving' | 'stable' | 'declining';
}

export function createMyProfile(
  token: string,
  input: {
    displayName: string;
    dateOfBirth: string;
    examBoard: ExamBoard;
    tier: StudentTier;
    targetGrade?: number;
  },
) {
  return apiRequest<{ student: StudentProfile }>('/students/profile', {
    method: 'POST',
    body: input,
    token,
  });
}

export function getMyProfile(token: string) {
  return apiRequest<{ student: StudentProfile }>('/students/profile', { token });
}

export function getMyMastery(token: string) {
  return apiRequest<{ mastery: MasteryRecord[] }>('/students/mastery', { token });
}
