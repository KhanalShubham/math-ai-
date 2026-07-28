export const PARENT_EVENTS = {
  StudentLinked: 'parent.StudentLinked',
  StudentUnlinked: 'parent.StudentUnlinked',
} as const;

export interface StudentLinkedPayload {
  parentId: string;
  studentId: string;
}

export interface StudentUnlinkedPayload {
  parentId: string;
  studentId: string;
}
