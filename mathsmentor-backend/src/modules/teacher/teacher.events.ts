export const TEACHER_EVENTS = {
  StudentEnrolledInClass: 'teacher.StudentEnrolledInClass',
  StudentWithdrawnFromClass: 'teacher.StudentWithdrawnFromClass',
} as const;

export interface StudentEnrolledInClassPayload {
  studentId: string;
  classId: string;
}

export interface StudentWithdrawnFromClassPayload {
  studentId: string;
  classId: string;
}
