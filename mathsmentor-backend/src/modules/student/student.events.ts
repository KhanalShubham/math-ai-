export const STUDENT_EVENTS = {
  StudentEnrolled: 'student.StudentEnrolled',
  StudentGradeEstimateChanged: 'student.StudentGradeEstimateChanged',
} as const;

export interface StudentEnrolledPayload {
  studentId: string;
  userId: string;
}

export interface StudentGradeEstimateChangedPayload {
  studentId: string;
  grade: number;
}
