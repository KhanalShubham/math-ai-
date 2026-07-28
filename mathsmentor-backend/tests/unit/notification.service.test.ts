import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createNotificationService } from '../../src/modules/notification/notification.service';
import { MASTERY_EVENTS } from '../../src/modules/student/mastery.events';
import type { NotificationRepository } from '../../src/modules/notification/notification.repository.interface';
import type {
  FindByUserOptions,
  NewNotification,
  Notification,
} from '../../src/modules/notification/notification.types';
import type { StudentService } from '../../src/modules/student/student.service';
import type { StudentProfile } from '../../src/modules/student/student.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeNotificationRepository implements NotificationRepository {
  readonly notifications: Notification[] = [];

  async create(notification: NewNotification): Promise<Notification> {
    const stored: Notification = { id: fakeId(), readAt: null, createdAt: new Date(), ...notification };
    this.notifications.push(stored);
    return stored;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.find((n) => n.id === id) ?? null;
  }

  async findByUser(userId: string, options?: FindByUserOptions): Promise<Notification[]> {
    let matches = this.notifications.filter((n) => n.userId === userId);
    if (options?.unreadOnly) matches = matches.filter((n) => !n.readAt);
    matches = [...matches].sort((a, b) => {
      if (!a.readAt !== !b.readAt) return a.readAt ? 1 : -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    return options?.limit ? matches.slice(0, options.limit) : matches;
  }

  async markRead(id: string): Promise<Notification> {
    const notification = this.notifications.find((n) => n.id === id);
    if (!notification) throw Object.assign(new Error('not found'), { code: 'NOT_FOUND' });
    notification.readAt = new Date();
    return notification;
  }

  async markAllReadForUser(userId: string): Promise<number> {
    let count = 0;
    for (const n of this.notifications) {
      if (n.userId === userId && !n.readAt) {
        n.readAt = new Date();
        count += 1;
      }
    }
    return count;
  }
}

class FakeStudentService implements Partial<StudentService> {
  private readonly profiles = new Map<string, StudentProfile>();

  seed(studentId: string, userId: string): void {
    this.profiles.set(studentId, {
      id: studentId,
      userId,
      displayName: 'Test Student',
      dateOfBirth: new Date('2010-01-01'),
      examBoard: 'AQA',
      tier: 'foundation',
      targetGrade: null,
      currentEstimatedGrade: null,
      classIds: [],
      parentIds: [],
      onboardingCompletedAt: null,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: null,
      createdAt: new Date(),
    });
  }

  async getById(id: string): Promise<StudentProfile> {
    const profile = this.profiles.get(id);
    if (!profile) throw Object.assign(new Error('not found'), { code: 'NOT_FOUND' });
    return profile;
  }
}

function buildService() {
  const notificationRepository = new FakeNotificationRepository();
  const studentService = new FakeStudentService();
  const eventBus = new InProcessEventBus();
  const service = createNotificationService({
    notificationRepository,
    studentService: studentService as unknown as StudentService,
    eventBus,
  });
  return { service, notificationRepository, studentService, eventBus };
}

describe('notification.service', () => {
  it('creates an in-app mastery_milestone notification for the right user when the event fires', async () => {
    const { service, studentService, eventBus } = buildService();
    const studentId = fakeId();
    const userId = fakeId();
    const topicId = fakeId();
    studentService.seed(studentId, userId);

    await eventBus.publish(MASTERY_EVENTS.MasteryMilestoneReached, {
      studentId,
      topicId,
      masteryScore: 0.85,
    });

    const notifications = await service.listMyNotifications(userId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      userId,
      type: 'mastery_milestone',
      payload: { topicId, masteryScore: 0.85 },
      deliveredVia: ['in_app'],
      readAt: null,
    });
  });

  it('lists unread-first and supports unreadOnly/limit filters', async () => {
    const { service, notificationRepository } = buildService();
    const userId = fakeId();
    await notificationRepository.create({
      userId,
      type: 'mastery_milestone',
      payload: {},
      deliveredVia: ['in_app'],
    });
    const second = await notificationRepository.create({
      userId,
      type: 'mastery_milestone',
      payload: {},
      deliveredVia: ['in_app'],
    });
    await notificationRepository.markRead(second.id);

    const all = await service.listMyNotifications(userId);
    expect(all).toHaveLength(2);
    expect(all[0]!.readAt).toBeNull();

    const unread = await service.listMyNotifications(userId, { unreadOnly: true });
    expect(unread).toHaveLength(1);
  });

  it('lets a user mark their own notification as read but not another user\'s', async () => {
    const { service, notificationRepository } = buildService();
    const ownerId = fakeId();
    const otherId = fakeId();
    const notification = await notificationRepository.create({
      userId: ownerId,
      type: 'mastery_milestone',
      payload: {},
      deliveredVia: ['in_app'],
    });

    const marked = await service.markRead(ownerId, notification.id);
    expect(marked.readAt).not.toBeNull();

    await expect(service.markRead(otherId, notification.id)).rejects.toThrow();
  });

  it('throws when marking a non-existent notification as read', async () => {
    const { service } = buildService();
    await expect(service.markRead(fakeId(), fakeId())).rejects.toThrow();
  });

  it('marks all of a user\'s unread notifications as read and reports the count', async () => {
    const { service, notificationRepository } = buildService();
    const userId = fakeId();
    await notificationRepository.create({ userId, type: 'mastery_milestone', payload: {}, deliveredVia: ['in_app'] });
    await notificationRepository.create({ userId, type: 'mastery_milestone', payload: {}, deliveredVia: ['in_app'] });

    const count = await service.markAllRead(userId);
    expect(count).toBe(2);

    const unread = await service.listMyNotifications(userId, { unreadOnly: true });
    expect(unread).toHaveLength(0);
  });
});
