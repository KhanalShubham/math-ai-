import { AuthorizationError, NotFoundError } from '../../errors';
import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { MASTERY_EVENTS, type MasteryMilestoneReachedPayload } from '../student/mastery.events';
import type { StudentService } from '../student/student.service';
import type { NotificationRepository } from './notification.repository.interface';
import type { FindByUserOptions, Notification } from './notification.types';

export interface NotificationService {
  listMyNotifications(userId: string, options?: FindByUserOptions): Promise<Notification[]>;
  markRead(userId: string, notificationId: string): Promise<Notification>;
  markAllRead(userId: string): Promise<number>;
}

export interface NotificationServiceDeps {
  notificationRepository: NotificationRepository;
  studentService: StudentService;
  eventBus: EventBus;
}

/**
 * notificationRepository.create is called ONLY from the event handler below
 * — no controller path creates a Notification directly (same single-write-path
 * convention as MasteryRecord/AnalyticsEvent). Only `mastery_milestone` is
 * wired up today; `streak_reminder`, `weekly_report`, and `assignment_due`
 * are documented tech debt — each is blocked on infrastructure or product
 * data this codebase doesn't have yet (a streak concept, a scheduled/cron
 * job runner, and a teacher-assigned practice due date, respectively).
 */
export function createNotificationService(deps: NotificationServiceDeps): NotificationService {
  deps.eventBus.subscribe<MasteryMilestoneReachedPayload>(
    MASTERY_EVENTS.MasteryMilestoneReached,
    async (event) => {
      const { studentId, topicId, masteryScore } = event.payload;
      // Notification.userId is the auth User id, not the StudentProfile id —
      // mastery only knows the latter, so resolve it via student's service
      // (a cross-module service call, not a repository reach-through).
      const student = await deps.studentService.getById(studentId);
      await deps.notificationRepository.create({
        userId: student.userId,
        type: 'mastery_milestone',
        payload: { topicId, masteryScore },
        deliveredVia: ['in_app'],
      });
    },
  );

  return {
    async listMyNotifications(userId, options) {
      return deps.notificationRepository.findByUser(userId, options);
    },

    async markRead(userId, notificationId) {
      const notification = await deps.notificationRepository.findById(notificationId);
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }
      if (notification.userId !== userId) {
        throw new AuthorizationError('You may only mark your own notifications as read');
      }
      return deps.notificationRepository.markRead(notificationId);
    },

    async markAllRead(userId) {
      return deps.notificationRepository.markAllReadForUser(userId);
    },
  };
}
