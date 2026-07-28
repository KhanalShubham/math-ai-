import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';

describe('teacher routes (integration, real Mongo)', () => {
  let mongod: MongoMemoryServer;
  const app = createApp(createContainer());

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }, 60_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  });

  function adminToken(): string {
    return signAccessToken({ sub: new mongoose.Types.ObjectId().toString(), role: 'admin' });
  }

  async function registerAndLogin(credentials: { email: string; password: string; role: string }) {
    await request(app).post('/api/v1/auth/register').send(credentials);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    return loginRes.body.accessToken as string;
  }

  async function registerLoginAndCreateStudentProfile() {
    const accessToken = await registerAndLogin({
      email: `student-${Math.random()}@example.com`,
      password: 'correct-horse-battery',
      role: 'student',
    });
    await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Ada',
        dateOfBirth: '2010-01-01',
        examBoard: 'AQA',
        tier: 'foundation',
        targetGrade: 7,
      });
    return accessToken;
  }

  async function seedSchool() {
    const token = adminToken();
    const res = await request(app)
      .post('/api/v1/teacher/schools')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Springfield High',
        address: { city: 'Springfield' },
        subscriptionTier: 'standard',
        contactEmail: 'admin@springfield.example',
      });
    return res.body.school.id as string;
  }

  async function registerLoginAndCreateTeacherProfile(schoolId: string) {
    const accessToken = await registerAndLogin({
      email: `teacher-${Math.random()}@example.com`,
      password: 'correct-horse-battery',
      role: 'teacher',
    });
    await request(app)
      .post('/api/v1/teacher/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ schoolId, subjects: ['Maths'] });
    return accessToken;
  }

  it('lets an admin create a school', async () => {
    const schoolId = await seedSchool();
    const token = adminToken();

    const res = await request(app)
      .get(`/api/v1/teacher/schools/${schoolId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.school.name).toBe('Springfield High');
  });

  it('rejects a non-admin creating a school', async () => {
    const accessToken = await registerAndLogin({
      email: 'teacher1@example.com',
      password: 'correct-horse-battery',
      role: 'teacher',
    });

    const res = await request(app)
      .post('/api/v1/teacher/schools')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Springfield High',
        subscriptionTier: 'standard',
        contactEmail: 'admin@springfield.example',
      });

    expect(res.status).toBe(403);
  });

  it('lets a teacher create their own profile and rejects a duplicate', async () => {
    const schoolId = await seedSchool();
    const accessToken = await registerLoginAndCreateTeacherProfile(schoolId);

    const getRes = await request(app)
      .get('/api/v1/teacher/profile')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.teacher.schoolId).toBe(schoolId);

    const dupRes = await request(app)
      .post('/api/v1/teacher/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ schoolId, subjects: ['Physics'] });
    expect(dupRes.status).toBe(409);
  });

  it('creating a class as a teacher auto-assigns that teacher', async () => {
    const schoolId = await seedSchool();
    const accessToken = await registerLoginAndCreateTeacherProfile(schoolId);

    const res = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ schoolId, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' });

    expect(res.status).toBe(201);
    expect(res.body.class.teacherIds).toHaveLength(1);

    const listRes = await request(app)
      .get('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.body.classes).toHaveLength(1);
  });

  it('enrolls and withdraws a student, closing membershipHistory with leftAt', async () => {
    const schoolId = await seedSchool();
    const teacherToken = await registerLoginAndCreateTeacherProfile(schoolId);
    const studentToken = await registerLoginAndCreateStudentProfile();

    const classRes = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ schoolId, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' });
    const classId = classRes.body.class.id as string;

    const studentProfileRes = await request(app)
      .get('/api/v1/students/profile')
      .set('Authorization', `Bearer ${studentToken}`);
    const studentId = studentProfileRes.body.student.id as string;

    const enrollRes = await request(app)
      .post(`/api/v1/teacher/classes/${classId}/students`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId });
    expect(enrollRes.status).toBe(200);
    expect(enrollRes.body.class.activeStudentIds).toEqual([studentId]);

    const withdrawRes = await request(app)
      .delete(`/api/v1/teacher/classes/${classId}/students/${studentId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.class.activeStudentIds).toEqual([]);
    expect(withdrawRes.body.class.membershipHistory).toHaveLength(1);
    expect(withdrawRes.body.class.membershipHistory[0].leftAt).not.toBeNull();
  });

  it("rejects a teacher enrolling a student into a class they aren't assigned to", async () => {
    const schoolId = await seedSchool();
    const ownerTeacherToken = await registerLoginAndCreateTeacherProfile(schoolId);
    const otherTeacherToken = await registerLoginAndCreateTeacherProfile(schoolId);
    const studentToken = await registerLoginAndCreateStudentProfile();

    const classRes = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${ownerTeacherToken}`)
      .send({ schoolId, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' });
    const classId = classRes.body.class.id as string;

    const studentProfileRes = await request(app)
      .get('/api/v1/students/profile')
      .set('Authorization', `Bearer ${studentToken}`);
    const studentId = studentProfileRes.body.student.id as string;

    const res = await request(app)
      .post(`/api/v1/teacher/classes/${classId}/students`)
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .send({ studentId });

    expect(res.status).toBe(403);
  });

  it('lets an admin add a second teacher to an existing class', async () => {
    const schoolId = await seedSchool();
    const ownerTeacherToken = await registerLoginAndCreateTeacherProfile(schoolId);
    const secondTeacherToken = await registerLoginAndCreateTeacherProfile(schoolId);
    const secondTeacherProfileRes = await request(app)
      .get('/api/v1/teacher/profile')
      .set('Authorization', `Bearer ${secondTeacherToken}`);
    const secondTeacherUserId = secondTeacherProfileRes.body.teacher.userId as string;

    const classRes = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${ownerTeacherToken}`)
      .send({ schoolId, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' });
    const classId = classRes.body.class.id as string;

    const adminRes = await request(app)
      .post(`/api/v1/teacher/classes/${classId}/teachers`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ teacherUserId: secondTeacherUserId });
    expect(adminRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/teacher/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(getRes.body.class.teacherIds).toHaveLength(2);
    expect(getRes.body.class.teacherIds).toContain(secondTeacherUserId);
  });

  it('rejects adding a teacher with no existing TeacherProfile to a class', async () => {
    const schoolId = await seedSchool();
    const teacherToken = await registerLoginAndCreateTeacherProfile(schoolId);
    const classRes = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ schoolId, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' });
    const classId = classRes.body.class.id as string;

    const res = await request(app)
      .post(`/api/v1/teacher/classes/${classId}/teachers`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ teacherUserId: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(404);
  });

  it('rejects enrolling a student who does not exist', async () => {
    const schoolId = await seedSchool();
    const teacherToken = await registerLoginAndCreateTeacherProfile(schoolId);

    const classRes = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ schoolId, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' });
    const classId = classRes.body.class.id as string;

    const res = await request(app)
      .post(`/api/v1/teacher/classes/${classId}/students`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(404);
  });

  it('rejects creating a class for a school that does not exist', async () => {
    const accessToken = await registerLoginAndCreateTeacherProfile(await seedSchool());

    const res = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        schoolId: new mongoose.Types.ObjectId().toString(),
        name: 'Ghost Class',
        examBoard: 'AQA',
        tier: 'foundation',
        academicYear: '2025/26',
      });

    expect(res.status).toBe(404);
  });
});
