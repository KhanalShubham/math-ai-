import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createParentService } from '../../src/modules/parent/parent.service';
import { PARENT_EVENTS } from '../../src/modules/parent/parent.events';
import type {
  CreateParentProfileInput,
  ParentRepository,
  UpdateNotificationPreferencesInput,
} from '../../src/modules/parent/parent.repository.interface';
import type { ParentProfile } from '../../src/modules/parent/parent.types';
import type { AuthService } from '../../src/modules/auth/auth.service';
import type { User } from '../../src/modules/auth/auth.types';
import type { StudentService } from '../../src/modules/student/student.service';
import type { StudentProfile } from '../../src/modules/student/student.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeParentRepository implements ParentRepository {
  private readonly profiles = new Map<string, ParentProfile>();

  async findById(id: string): Promise<ParentProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<ParentProfile | null> {
    return [...this.profiles.values()].find((p) => p.userId === userId) ?? null;
  }

  async findByVerifiedStudentId(studentId: string): Promise<ParentProfile[]> {
    return [...this.profiles.values()].filter((p) => p.verifiedStudentIds.includes(studentId));
  }

  async create(input: CreateParentProfileInput): Promise<ParentProfile> {
    const profile: ParentProfile = {
      id: fakeId(),
      userId: input.userId,
      verifiedStudentIds: [],
      notificationPreferences: { email: true, sms: false },
      createdAt: new Date(),
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async addVerifiedStudent(parentId: string, studentId: string): Promise<void> {
    const profile = this.profiles.get(parentId);
    if (profile && !profile.verifiedStudentIds.includes(studentId)) {
      profile.verifiedStudentIds.push(studentId);
    }
  }

  async removeVerifiedStudent(parentId: string, studentId: string): Promise<void> {
    const profile = this.profiles.get(parentId);
    if (profile) {
      profile.verifiedStudentIds = profile.verifiedStudentIds.filter((id) => id !== studentId);
    }
  }

  async updateNotificationPreferences(
    parentId: string,
    patch: UpdateNotificationPreferencesInput,
  ): Promise<ParentProfile> {
    const profile = this.profiles.get(parentId);
    if (!profile) throw new Error('not found');
    Object.assign(profile.notificationPreferences, patch);
    return profile;
  }
}

class FakeAuthService implements Partial<AuthService> {
  private readonly users = new Map<string, User>();

  seed(email: string, role: User['role'] = 'student'): User {
    const user: User = {
      id: fakeId(),
      email,
      role,
      status: 'active',
      emailVerifiedAt: null,
      lastLoginAt: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
    };
    this.users.set(email, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.get(email) ?? null;
  }
}

class FakeStudentService implements Partial<StudentService> {
  private readonly profiles = new Map<string, StudentProfile>();
  private readonly byUserId = new Map<string, StudentProfile>();

  seed(userId: string): StudentProfile {
    const profile: StudentProfile = {
      id: fakeId(),
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
      createdAt: new Date(),
    };
    this.profiles.set(profile.id, profile);
    this.byUserId.set(userId, profile);
    return profile;
  }

  async getByUserId(userId: string): Promise<StudentProfile> {
    const profile = this.byUserId.get(userId);
    if (!profile) throw Object.assign(new Error('not found'), { code: 'NOT_FOUND' });
    return profile;
  }

  async getByParentId(parentUserId: string): Promise<StudentProfile[]> {
    return [...this.profiles.values()].filter((p) => p.parentIds.includes(parentUserId));
  }

  async addParentLink(studentId: string, parentUserId: string): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (profile && !profile.parentIds.includes(parentUserId)) {
      profile.parentIds.push(parentUserId);
    }
  }

  async removeParentLink(studentId: string, parentUserId: string): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (profile) profile.parentIds = profile.parentIds.filter((id) => id !== parentUserId);
  }
}

function buildService() {
  const parentRepository = new FakeParentRepository();
  const authService = new FakeAuthService();
  const studentService = new FakeStudentService();
  const eventBus = new InProcessEventBus();
  const service = createParentService({
    parentRepository,
    authService: authService as unknown as AuthService,
    studentService: studentService as unknown as StudentService,
    eventBus,
  });
  return { service, parentRepository, authService, studentService, eventBus };
}

describe('parent.service', () => {
  it('creates a parent profile', async () => {
    const { service } = buildService();
    const profile = await service.createProfile(fakeId());
    expect(profile.verifiedStudentIds).toEqual([]);
    expect(profile.notificationPreferences).toEqual({ email: true, sms: false });
  });

  it('rejects creating a second profile for the same user', async () => {
    const { service } = buildService();
    const userId = fakeId();
    await service.createProfile(userId);
    await expect(service.createProfile(userId)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('links a student by email, writing ParentProfile then calling student.service.addParentLink', async () => {
    const { service, authService, studentService, eventBus } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);
    const studentUser = authService.seed('child@example.com', 'student');
    const studentProfile = studentService.seed(studentUser.id);

    const events: unknown[] = [];
    eventBus.subscribe(PARENT_EVENTS.StudentLinked, async (e) => {
      events.push(e.payload);
    });

    const updated = await service.linkStudentByEmail(parentUserId, 'child@example.com');

    expect(updated.verifiedStudentIds).toEqual([studentProfile.id]);
    expect(studentProfile.parentIds).toEqual([parentUserId]);
    expect(events).toHaveLength(1);
  });

  it('rejects linking an email that has no account', async () => {
    const { service } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);

    await expect(
      service.linkStudentByEmail(parentUserId, 'nobody@example.com'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects linking an email that belongs to a non-student account', async () => {
    const { service, authService } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);
    authService.seed('teacher@example.com', 'teacher');

    await expect(
      service.linkStudentByEmail(parentUserId, 'teacher@example.com'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects linking the same student twice', async () => {
    const { service, authService, studentService } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);
    const studentUser = authService.seed('child@example.com', 'student');
    studentService.seed(studentUser.id);
    await service.linkStudentByEmail(parentUserId, 'child@example.com');

    await expect(
      service.linkStudentByEmail(parentUserId, 'child@example.com'),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('unlinks a student, removing the link on both sides', async () => {
    const { service, authService, studentService, eventBus } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);
    const studentUser = authService.seed('child@example.com', 'student');
    const studentProfile = studentService.seed(studentUser.id);
    await service.linkStudentByEmail(parentUserId, 'child@example.com');

    const events: unknown[] = [];
    eventBus.subscribe(PARENT_EVENTS.StudentUnlinked, async (e) => {
      events.push(e.payload);
    });

    const updated = await service.unlinkStudent(parentUserId, studentProfile.id);

    expect(updated.verifiedStudentIds).toEqual([]);
    expect(studentProfile.parentIds).toEqual([]);
    expect(events).toHaveLength(1);
  });

  it('rejects unlinking a student that is not linked', async () => {
    const { service } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);

    await expect(service.unlinkStudent(parentUserId, fakeId())).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('lists a parent’s linked children via student.service.getByParentId (child lookup)', async () => {
    const { service, authService, studentService } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);
    const studentUser = authService.seed('child@example.com', 'student');
    studentService.seed(studentUser.id);
    await service.linkStudentByEmail(parentUserId, 'child@example.com');

    const children = await service.getChildren(parentUserId);
    expect(children).toHaveLength(1);
  });

  it('finds guardians for a student (guardian lookup)', async () => {
    const { service, authService, studentService } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);
    const studentUser = authService.seed('child@example.com', 'student');
    const studentProfile = studentService.seed(studentUser.id);
    await service.linkStudentByEmail(parentUserId, 'child@example.com');

    const guardians = await service.getGuardiansForStudent(studentProfile.id);
    expect(guardians).toHaveLength(1);
    expect(guardians[0]!.userId).toBe(parentUserId);
  });

  it('updates notification preferences', async () => {
    const { service } = buildService();
    const parentUserId = fakeId();
    await service.createProfile(parentUserId);

    const updated = await service.updateNotificationPreferences(parentUserId, { sms: true });
    expect(updated.notificationPreferences).toEqual({ email: true, sms: true });
  });
});
