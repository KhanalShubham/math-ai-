import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';

describe('parent routes (integration, real Mongo)', () => {
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

  async function registerLoginAndCreateStudentProfile(email: string) {
    const accessToken = await registerAndLogin({
      email,
      password: 'correct-horse-battery',
      role: 'student',
    });
    const profileRes = await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Ada',
        dateOfBirth: '2010-01-01',
        examBoard: 'AQA',
        tier: 'foundation',
        targetGrade: 7,
      });
    return { accessToken, studentId: profileRes.body.student.id as string };
  }

  async function registerLoginAndCreateParentProfile() {
    const accessToken = await registerAndLogin({
      email: `parent-${Math.random()}@example.com`,
      password: 'correct-horse-battery',
      role: 'parent',
    });
    await request(app)
      .post('/api/v1/parent/profile')
      .set('Authorization', `Bearer ${accessToken}`);
    return accessToken;
  }

  it('lets a parent create their own profile and rejects a duplicate', async () => {
    const accessToken = await registerLoginAndCreateParentProfile();

    const getRes = await request(app)
      .get('/api/v1/parent/profile')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.parent.verifiedStudentIds).toEqual([]);

    const dupRes = await request(app)
      .post('/api/v1/parent/profile')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(dupRes.status).toBe(409);
  });

  it('links a student by email and lists them under /parent/children', async () => {
    const parentToken = await registerLoginAndCreateParentProfile();
    const { studentId } = await registerLoginAndCreateStudentProfile('child1@example.com');

    const linkRes = await request(app)
      .post('/api/v1/parent/links')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentEmail: 'child1@example.com' });
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.parent.verifiedStudentIds).toEqual([studentId]);

    const childrenRes = await request(app)
      .get('/api/v1/parent/children')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(childrenRes.status).toBe(200);
    expect(childrenRes.body.children).toHaveLength(1);
    expect(childrenRes.body.children[0].id).toBe(studentId);
  });

  it('rejects linking an email with no matching student account', async () => {
    const parentToken = await registerLoginAndCreateParentProfile();

    const res = await request(app)
      .post('/api/v1/parent/links')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentEmail: 'nobody@example.com' });

    expect(res.status).toBe(404);
  });

  it('unlinks a student, removing it from both the parent and the student side', async () => {
    const parentToken = await registerLoginAndCreateParentProfile();
    const { studentId, accessToken: studentToken } =
      await registerLoginAndCreateStudentProfile('child2@example.com');

    await request(app)
      .post('/api/v1/parent/links')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentEmail: 'child2@example.com' });

    const unlinkRes = await request(app)
      .delete(`/api/v1/parent/links/${studentId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(unlinkRes.status).toBe(200);
    expect(unlinkRes.body.parent.verifiedStudentIds).toEqual([]);

    const studentProfileRes = await request(app)
      .get('/api/v1/students/profile')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentProfileRes.body.student.id).toBe(studentId);
    // parentIds isn't in the public student projection, but the parent-side
    // list is authoritative here: an admin guardian lookup confirms removal.
    const guardiansRes = await request(app)
      .get(`/api/v1/parent/guardians/${studentId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(guardiansRes.body.guardians).toEqual([]);
  });

  it('rejects unlinking a student who was never linked', async () => {
    const parentToken = await registerLoginAndCreateParentProfile();

    const res = await request(app)
      .delete(`/api/v1/parent/links/${new mongoose.Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(400);
  });

  it('rejects a non-admin looking up guardians for a student', async () => {
    const parentToken = await registerLoginAndCreateParentProfile();
    const { studentId } = await registerLoginAndCreateStudentProfile('child3@example.com');

    const res = await request(app)
      .get(`/api/v1/parent/guardians/${studentId}`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(403);
  });

  it('lets an admin look up guardians for a student after linking', async () => {
    const parentToken = await registerLoginAndCreateParentProfile();
    const { studentId } = await registerLoginAndCreateStudentProfile('child4@example.com');
    await request(app)
      .post('/api/v1/parent/links')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentEmail: 'child4@example.com' });

    const res = await request(app)
      .get(`/api/v1/parent/guardians/${studentId}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.guardians).toHaveLength(1);
  });

  it('updates notification preferences', async () => {
    const parentToken = await registerLoginAndCreateParentProfile();

    const res = await request(app)
      .patch('/api/v1/parent/preferences')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ sms: true });

    expect(res.status).toBe(200);
    expect(res.body.parent.notificationPreferences).toEqual({ email: true, sms: true });
  });

  it('rejects a non-parent role creating a parent profile', async () => {
    const accessToken = await registerAndLogin({
      email: 'teacher@example.com',
      password: 'correct-horse-battery',
      role: 'teacher',
    });

    const res = await request(app)
      .post('/api/v1/parent/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});
