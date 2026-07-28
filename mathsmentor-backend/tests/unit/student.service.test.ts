import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createStudentService } from '../../src/modules/student/student.service';
import { STUDENT_EVENTS } from '../../src/modules/student/student.events';
import { PRACTICE_EVENTS } from '../../src/modules/practice/practice.events';
import { DIAGNOSTIC_EVENTS } from '../../src/modules/diagnostic/diagnostic.events';
import { computeStreakUpdate, type StreakState } from '../../src/modules/student/streak';
import type {
  CreateStudentProfileInput,
  StudentRepository,
  UpdateStudentProfileInput,
} from '../../src/modules/student/student.repository.interface';
import type { StudentProfile } from '../../src/modules/student/student.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeStudentRepository implements StudentRepository {
  private readonly profiles = new Map<string, StudentProfile>();

  async findById(id: string): Promise<StudentProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<StudentProfile | null> {
    return [...this.profiles.values()].find((p) => p.userId === userId) ?? null;
  }

  async findByClassId(classId: string): Promise<StudentProfile[]> {
    return [...this.profiles.values()].filter((p) => p.classIds.includes(classId));
  }

  async findByParentId(parentId: string): Promise<StudentProfile[]> {
    return [...this.profiles.values()].filter((p) => p.parentIds.includes(parentId));
  }

  async create(input: CreateStudentProfileInput): Promise<StudentProfile> {
    const profile: StudentProfile = {
      id: fakeId(),
      userId: input.userId,
      displayName: input.displayName,
      dateOfBirth: input.dateOfBirth,
      examBoard: input.examBoard,
      tier: input.tier,
      targetGrade: input.targetGrade ?? null,
      currentEstimatedGrade: null,
      classIds: [],
      parentIds: [],
      onboardingCompletedAt: null,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: null,
      createdAt: new Date(),
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async updateProfile(
    studentId: string,
    patch: UpdateStudentProfileInput,
  ): Promise<StudentProfile> {
    const profile = this.profiles.get(studentId);
    if (!profile) throw new Error('not found');
    Object.assign(profile, patch);
    return profile;
  }

  async updateEstimatedGrade(studentId: string, grade: number): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (profile) profile.currentEstimatedGrade = grade;
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

  async addClassLink(studentId: string, classId: string): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (profile && !profile.classIds.includes(classId)) {
      profile.classIds.push(classId);
    }
  }

  async removeClassLink(studentId: string, classId: string): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (profile) profile.classIds = profile.classIds.filter((id) => id !== classId);
  }

  async recordActivity(studentId: string, activityDate: Date): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (!profile) return;
    const updated = computeStreakUpdate(
      {
        currentStreakDays: profile.currentStreakDays,
        longestStreakDays: profile.longestStreakDays,
        lastActiveDate: profile.lastActiveDate,
      },
      activityDate,
    );
    profile.currentStreakDays = updated.currentStreakDays;
    profile.longestStreakDays = updated.longestStreakDays;
    profile.lastActiveDate = updated.lastActiveDate;
  }
}

function buildService() {
  const studentRepository = new FakeStudentRepository();
  const eventBus = new InProcessEventBus();
  const service = createStudentService({ studentRepository, eventBus });
  return { service, studentRepository, eventBus };
}

const NEW_PROFILE_INPUT: CreateStudentProfileInput = {
  userId: '',
  displayName: 'Ada',
  dateOfBirth: new Date('2010-01-01'),
  examBoard: 'AQA',
  tier: 'foundation',
  targetGrade: 7,
};

describe('student.service', () => {
  it('creates a profile and publishes StudentEnrolled', async () => {
    const { service, eventBus } = buildService();
    const events: string[] = [];
    eventBus.subscribe(STUDENT_EVENTS.StudentEnrolled, async () => {
      events.push(STUDENT_EVENTS.StudentEnrolled);
    });

    const userId = fakeId();
    const profile = await service.createProfile({ ...NEW_PROFILE_INPUT, userId });

    expect(profile.userId).toBe(userId);
    expect(profile.currentEstimatedGrade).toBeNull();
    expect(events).toEqual([STUDENT_EVENTS.StudentEnrolled]);
  });

  it('rejects creating a second profile for the same user', async () => {
    const { service } = buildService();
    const userId = fakeId();
    await service.createProfile({ ...NEW_PROFILE_INPUT, userId });

    await expect(service.createProfile({ ...NEW_PROFILE_INPUT, userId })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('rejects fetching a profile that does not exist', async () => {
    const { service } = buildService();
    await expect(service.getByUserId(fakeId())).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('updates a profile by userId', async () => {
    const { service } = buildService();
    const userId = fakeId();
    await service.createProfile({ ...NEW_PROFILE_INPUT, userId });

    const updated = await service.updateProfile(userId, { displayName: 'Ada Lovelace' });

    expect(updated.displayName).toBe('Ada Lovelace');
  });

  it('rejects updating a profile for a user with no profile', async () => {
    const { service } = buildService();
    await expect(service.updateProfile(fakeId(), { displayName: 'Nobody' })).rejects.toMatchObject(
      { code: 'NOT_FOUND' },
    );
  });

  it('updates the estimated grade and publishes StudentGradeEstimateChanged', async () => {
    const { service, studentRepository, eventBus } = buildService();
    const userId = fakeId();
    const profile = await service.createProfile({ ...NEW_PROFILE_INPUT, userId });

    const events: number[] = [];
    eventBus.subscribe<{ grade: number }>(STUDENT_EVENTS.StudentGradeEstimateChanged, async (e) => {
      events.push(e.payload.grade);
    });

    await service.updateEstimatedGrade(profile.id, 6);

    const stored = await studentRepository.findById(profile.id);
    expect(stored?.currentEstimatedGrade).toBe(6);
    expect(events).toEqual([6]);
  });

  it('lists students by class and by parent', async () => {
    const { service, studentRepository } = buildService();
    const userId = fakeId();
    const profile = await service.createProfile({ ...NEW_PROFILE_INPUT, userId });
    const classId = fakeId();
    const parentId = fakeId();
    await studentRepository.updateProfile(profile.id, {});
    // Simulate class/parent assignment done by other modules' write paths.
    (await studentRepository.findById(profile.id))!.classIds.push(classId);
    await service.addParentLink(profile.id, parentId);

    const byClass = await service.getByClassId(classId);
    const byParent = await service.getByParentId(parentId);

    expect(byClass.map((p) => p.id)).toContain(profile.id);
    expect(byParent.map((p) => p.id)).toContain(profile.id);
  });

  it('does not add the same parent link twice', async () => {
    const { service, studentRepository } = buildService();
    const userId = fakeId();
    const profile = await service.createProfile({ ...NEW_PROFILE_INPUT, userId });
    const parentId = fakeId();

    await service.addParentLink(profile.id, parentId);
    await service.addParentLink(profile.id, parentId);

    const stored = await studentRepository.findById(profile.id);
    expect(stored?.parentIds).toEqual([parentId]);
  });

  it('records a study-streak day on PracticeItemSubmitted', async () => {
    const { service, studentRepository, eventBus } = buildService();
    const userId = fakeId();
    const profile = await service.createProfile({ ...NEW_PROFILE_INPUT, userId });

    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId: profile.id,
      topicId: fakeId(),
      questionId: fakeId(),
      isCorrect: true,
    });

    const stored = await studentRepository.findById(profile.id);
    expect(stored?.currentStreakDays).toBe(1);
    expect(stored?.longestStreakDays).toBe(1);
    expect(stored?.lastActiveDate).not.toBeNull();
  });

  it('records a study-streak day on DiagnosticCompleted', async () => {
    const { service, studentRepository, eventBus } = buildService();
    const userId = fakeId();
    const profile = await service.createProfile({ ...NEW_PROFILE_INPUT, userId });

    await eventBus.publish(DIAGNOSTIC_EVENTS.DiagnosticCompleted, {
      studentId: profile.id,
      finalGradeEstimate: 6,
      topicBreakdown: [],
    });

    const stored = await studentRepository.findById(profile.id);
    expect(stored?.currentStreakDays).toBe(1);
  });

  it('does not double-count a streak day for two activities on the same day', async () => {
    const { service, studentRepository, eventBus } = buildService();
    const userId = fakeId();
    const profile = await service.createProfile({ ...NEW_PROFILE_INPUT, userId });

    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId: profile.id,
      topicId: fakeId(),
      questionId: fakeId(),
      isCorrect: true,
    });
    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId: profile.id,
      topicId: fakeId(),
      questionId: fakeId(),
      isCorrect: false,
    });

    const stored = await studentRepository.findById(profile.id);
    expect(stored?.currentStreakDays).toBe(1);
  });
});

describe('computeStreakUpdate', () => {
  const EMPTY: StreakState = { currentStreakDays: 0, longestStreakDays: 0, lastActiveDate: null };

  it('starts a new streak at 1 for the first-ever activity', () => {
    const result = computeStreakUpdate(EMPTY, new Date('2026-01-01T10:00:00Z'));
    expect(result).toMatchObject({ currentStreakDays: 1, longestStreakDays: 1 });
  });

  it('does not change the streak for a second activity on the same day', () => {
    const first = computeStreakUpdate(EMPTY, new Date('2026-01-01T09:00:00Z'));
    const second = computeStreakUpdate(first, new Date('2026-01-01T21:00:00Z'));
    expect(second.currentStreakDays).toBe(1);
  });

  it('increments the streak for activity on the very next calendar day', () => {
    const first = computeStreakUpdate(EMPTY, new Date('2026-01-01T09:00:00Z'));
    const second = computeStreakUpdate(first, new Date('2026-01-02T09:00:00Z'));
    expect(second.currentStreakDays).toBe(2);
    expect(second.longestStreakDays).toBe(2);
  });

  it('resets the streak to 1 after a gap of more than one day', () => {
    const first = computeStreakUpdate(EMPTY, new Date('2026-01-01T09:00:00Z'));
    const second = computeStreakUpdate(first, new Date('2026-01-05T09:00:00Z'));
    expect(second.currentStreakDays).toBe(1);
  });

  it('keeps longestStreakDays at its historical peak after a reset', () => {
    let state = EMPTY;
    state = computeStreakUpdate(state, new Date('2026-01-01T09:00:00Z'));
    state = computeStreakUpdate(state, new Date('2026-01-02T09:00:00Z'));
    state = computeStreakUpdate(state, new Date('2026-01-03T09:00:00Z'));
    expect(state.longestStreakDays).toBe(3);

    state = computeStreakUpdate(state, new Date('2026-01-10T09:00:00Z'));
    expect(state.currentStreakDays).toBe(1);
    expect(state.longestStreakDays).toBe(3);
  });
});
