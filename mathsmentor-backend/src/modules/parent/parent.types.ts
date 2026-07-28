export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
}

/**
 * Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.3).
 * `verifiedStudentIds` is populated only via the link-verification flow in
 * parent.service — never simply "parent claims a student".
 */
export interface ParentProfile {
  id: string;
  userId: string;
  verifiedStudentIds: string[];
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
}
