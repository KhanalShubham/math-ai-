import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createTeacherService } from '../../src/modules/teacher/teacher.service';
import { TEACHER_EVENTS } from '../../src/modules/teacher/teacher.events';
import type {
  ClassGroupRepository,
  CreateClassGroupInput,
  CreateSchoolInput,
  CreateTeacherProfileInput,
  SchoolRepository,
  TeacherProfileRepository,
} from '../../src/modules/teacher/teacher.repository.interface';
import type { ClassGroup, School, TeacherProfile } from '../../src/modules/teacher/teacher.types';
import type { StudentService } from '../../src/modules/student/student.service';
import type { StudentProfile } from '../../src/modules/student/student.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeSchoolRepository implements SchoolRepository {
  private readonly schools = new Map<string, School>();

  async findById(id: string): Promise<School | null> {
    return this.schools.get(id) ?? null;
  }

  async create(input: CreateSchoolInput): Promise<School> {
    const school: School = {
      id: fakeId(),
      name: input.name,
      address: input.address,
      subscriptionTier: input.subscriptionTier,
      contactEmail: input.contactEmail,
      createdAt: new Date(),
    };
    this.schools.set(school.id, school);
    return school;
  }
}

class FakeTeacherProfileRepository implements TeacherProfileRepository {
  private readonly profiles = new Map<string, TeacherProfile>();

  async findById(id: string): Promise<TeacherProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<TeacherProfile | null> {
    return [...this.profiles.values()].find((p) => p.userId === userId) ?? null;
  }

  async create(input: CreateTeacherProfileInput): Promise<TeacherProfile> {
    const profile: TeacherProfile = {
      id: fakeId(),
      userId: input.userId,
      schoolId: input.schoolId,
      classIds: [],
      subjects: input.subjects,
      createdAt: new Date(),
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async addClassLink(teacherId: string, classId: string): Promise<void> {
    const profile = this.profiles.get(teacherId);
    if (profile && !profile.classIds.includes(classId)) profile.classIds.push(classId);
  }
}

class FakeClassGroupRepository implements ClassGroupRepository {
  private readonly classes = new Map<string, ClassGroup>();

  async findById(id: string): Promise<ClassGroup | null> {
    return this.classes.get(id) ?? null;
  }

  async findBySchool(schoolId: string): Promise<ClassGroup[]> {
    return [...this.classes.values()].filter((c) => c.schoolId === schoolId);
  }

  async findByTeacher(teacherUserId: string): Promise<ClassGroup[]> {
    return [...this.classes.values()].filter((c) => c.teacherIds.includes(teacherUserId));
  }

  async create(input: CreateClassGroupInput): Promise<ClassGroup> {
    const classGroup: ClassGroup = {
      id: fakeId(),
      schoolId: input.schoolId,
      name: input.name,
      examBoard: input.examBoard,
      tier: input.tier,
      teacherIds: [],
      activeStudentIds: [],
      membershipHistory: [],
      academicYear: input.academicYear,
      createdAt: new Date(),
    };
    this.classes.set(classGroup.id, classGroup);
    return classGroup;
  }

  async addTeacher(classId: string, teacherUserId: string): Promise<void> {
    const classGroup = this.classes.get(classId);
    if (classGroup && !classGroup.teacherIds.includes(teacherUserId)) {
      classGroup.teacherIds.push(teacherUserId);
    }
  }

  async enrollStudent(classId: string, studentId: string, joinedAt: Date): Promise<ClassGroup> {
    const classGroup = this.classes.get(classId);
    if (!classGroup) throw new Error('not found');
    classGroup.membershipHistory.push({ studentId, joinedAt, leftAt: null });
    if (!classGroup.activeStudentIds.includes(studentId)) {
      classGroup.activeStudentIds.push(studentId);
    }
    return classGroup;
  }

  async withdrawStudent(classId: string, studentId: string, leftAt: Date): Promise<ClassGroup> {
    const classGroup = this.classes.get(classId);
    if (!classGroup) throw new Error('not found');
    classGroup.activeStudentIds = classGroup.activeStudentIds.filter((id) => id !== studentId);
    const openEntry = [...classGroup.membershipHistory]
      .reverse()
      .find((entry) => entry.studentId === studentId && !entry.leftAt);
    if (openEntry) openEntry.leftAt = leftAt;
    return classGroup;
  }
}

class FakeStudentService implements Partial<StudentService> {
  private readonly profiles = new Map<string, StudentProfile>();

  seed(id: string): void {
    this.profiles.set(id, {
      id,
      userId: fakeId(),
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

  async addClassLink(studentId: string, classId: string): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (profile && !profile.classIds.includes(classId)) profile.classIds.push(classId);
  }

  async removeClassLink(studentId: string, classId: string): Promise<void> {
    const profile = this.profiles.get(studentId);
    if (profile) profile.classIds = profile.classIds.filter((id) => id !== classId);
  }

  getClassIds(studentId: string): string[] {
    return this.profiles.get(studentId)?.classIds ?? [];
  }
}

function buildService() {
  const schoolRepository = new FakeSchoolRepository();
  const teacherProfileRepository = new FakeTeacherProfileRepository();
  const classGroupRepository = new FakeClassGroupRepository();
  const studentService = new FakeStudentService();
  const eventBus = new InProcessEventBus();
  const service = createTeacherService({
    schoolRepository,
    teacherProfileRepository,
    classGroupRepository,
    studentService: studentService as unknown as StudentService,
    eventBus,
  });
  return { service, schoolRepository, teacherProfileRepository, classGroupRepository, studentService, eventBus };
}

const NEW_SCHOOL_INPUT: CreateSchoolInput = {
  name: 'Springfield High',
  address: { city: 'Springfield' },
  subscriptionTier: 'standard',
  contactEmail: 'admin@springfield.example',
};

describe('teacher.service — profiles and schools', () => {
  it('creates a teacher profile for a valid school', async () => {
    const { service, schoolRepository } = buildService();
    const school = await schoolRepository.create(NEW_SCHOOL_INPUT);
    const userId = fakeId();

    const profile = await service.createProfile({ userId, schoolId: school.id, subjects: ['Maths'] });

    expect(profile.schoolId).toBe(school.id);
    expect(profile.classIds).toEqual([]);
  });

  it('rejects a teacher profile for a school that does not exist', async () => {
    const { service } = buildService();
    await expect(
      service.createProfile({ userId: fakeId(), schoolId: fakeId(), subjects: ['Maths'] }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects creating a second teacher profile for the same user', async () => {
    const { service, schoolRepository } = buildService();
    const school = await schoolRepository.create(NEW_SCHOOL_INPUT);
    const userId = fakeId();
    await service.createProfile({ userId, schoolId: school.id, subjects: ['Maths'] });

    await expect(
      service.createProfile({ userId, schoolId: school.id, subjects: ['Physics'] }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('teacher.service — classes and enrollment (AD-011)', () => {
  async function seedClass(service: ReturnType<typeof buildService>) {
    const school = await service.schoolRepository.create(NEW_SCHOOL_INPUT);
    const teacherUserId = fakeId();
    await service.teacherProfileRepository.create({
      userId: teacherUserId,
      schoolId: school.id,
      subjects: ['Maths'],
    });
    const classGroup = await service.service.createClass(
      { schoolId: school.id, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' },
      teacherUserId,
    );
    return { classGroup, teacherUserId };
  }

  it('creating a class with a teacher automatically assigns that teacher', async () => {
    const ctx = buildService();
    const { classGroup, teacherUserId } = await seedClass(ctx);
    expect(classGroup.teacherIds).toEqual([teacherUserId]);
  });

  it('enrolling a student writes ClassGroup first, then calls student.service.addClassLink (AD-011)', async () => {
    const ctx = buildService();
    const { classGroup } = await seedClass(ctx);
    const studentId = fakeId();
    ctx.studentService.seed(studentId);

    const events: unknown[] = [];
    ctx.eventBus.subscribe(TEACHER_EVENTS.StudentEnrolledInClass, async (e) => {
      events.push(e.payload);
    });

    const updated = await ctx.service.enrollStudent(classGroup.id, studentId);

    expect(updated.activeStudentIds).toEqual([studentId]);
    expect(updated.membershipHistory).toEqual([
      { studentId, joinedAt: expect.any(Date), leftAt: null },
    ]);
    expect(ctx.studentService.getClassIds(studentId)).toEqual([classGroup.id]);
    expect(events).toEqual([{ studentId, classId: classGroup.id }]);
  });

  it('rejects enrolling a student who does not exist', async () => {
    const ctx = buildService();
    const { classGroup } = await seedClass(ctx);
    await expect(ctx.service.enrollStudent(classGroup.id, fakeId())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rejects enrolling a student already active in the class', async () => {
    const ctx = buildService();
    const { classGroup } = await seedClass(ctx);
    const studentId = fakeId();
    ctx.studentService.seed(studentId);
    await ctx.service.enrollStudent(classGroup.id, studentId);

    await expect(ctx.service.enrollStudent(classGroup.id, studentId)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('withdrawing a student closes the open membershipHistory entry with leftAt and removes it from the roster', async () => {
    const ctx = buildService();
    const { classGroup } = await seedClass(ctx);
    const studentId = fakeId();
    ctx.studentService.seed(studentId);
    await ctx.service.enrollStudent(classGroup.id, studentId);

    const updated = await ctx.service.withdrawStudent(classGroup.id, studentId);

    expect(updated.activeStudentIds).toEqual([]);
    expect(updated.membershipHistory).toHaveLength(1);
    expect(updated.membershipHistory[0]!.leftAt).not.toBeNull();
    expect(ctx.studentService.getClassIds(studentId)).toEqual([]);
  });

  it('rejects withdrawing a student who is not currently enrolled', async () => {
    const ctx = buildService();
    const { classGroup } = await seedClass(ctx);
    await expect(ctx.service.withdrawStudent(classGroup.id, fakeId())).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('supports multiple historical memberships without mutating a closed entry (rejoin after leaving)', async () => {
    const ctx = buildService();
    const { classGroup } = await seedClass(ctx);
    const studentId = fakeId();
    ctx.studentService.seed(studentId);

    await ctx.service.enrollStudent(classGroup.id, studentId);
    await ctx.service.withdrawStudent(classGroup.id, studentId);
    const firstEntryLeftAt = (await ctx.classGroupRepository.findById(classGroup.id))!
      .membershipHistory[0]!.leftAt;

    const rejoined = await ctx.service.enrollStudent(classGroup.id, studentId);

    expect(rejoined.membershipHistory).toHaveLength(2);
    expect(rejoined.membershipHistory[0]!.leftAt).toEqual(firstEntryLeftAt); // untouched
    expect(rejoined.membershipHistory[1]!.leftAt).toBeNull(); // new open entry
    expect(rejoined.activeStudentIds).toEqual([studentId]);
  });

  it('rejects adding a teacher who is already assigned to the class', async () => {
    const ctx = buildService();
    const { classGroup, teacherUserId } = await seedClass(ctx);
    await expect(ctx.service.addTeacherToClass(classGroup.id, teacherUserId)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
});
