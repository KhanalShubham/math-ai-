import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';

describe('student routes (integration, real Mongo)', () => {
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

  const studentCredentials = {
    email: 'student@example.com',
    password: 'correct-horse-battery',
    role: 'student',
  };

  async function registerAndLogin(credentials: {
    email: string;
    password: string;
    role: string;
  }) {
    await request(app).post('/api/v1/auth/register').send(credentials);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    return loginRes.body.accessToken as string;
  }

  const newProfile = {
    displayName: 'Ada',
    dateOfBirth: '2010-01-01',
    examBoard: 'AQA',
    tier: 'foundation',
    targetGrade: 7,
  };

  it('creates, fetches, and updates the caller student profile', async () => {
    const accessToken = await registerAndLogin(studentCredentials);

    const createRes = await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newProfile);
    expect(createRes.status).toBe(201);
    expect(createRes.body.student.displayName).toBe('Ada');
    expect(createRes.body.student.currentEstimatedGrade).toBeNull();

    const getRes = await request(app)
      .get('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.student.examBoard).toBe('AQA');

    const patchRes = await request(app)
      .patch('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Ada Lovelace' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.student.displayName).toBe('Ada Lovelace');
  });

  it('rejects a second profile creation for the same student with 409', async () => {
    const accessToken = await registerAndLogin(studentCredentials);

    await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newProfile);
    const res = await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newProfile);

    expect(res.status).toBe(409);
  });

  it('rejects fetching a profile before one has been created', async () => {
    const accessToken = await registerAndLogin(studentCredentials);

    const res = await request(app)
      .get('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('rejects profile creation with an invalid exam board', async () => {
    const accessToken = await registerAndLogin(studentCredentials);

    const res = await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...newProfile, examBoard: 'NOT_A_BOARD' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a teacher account creating a student profile', async () => {
    const accessToken = await registerAndLogin({
      email: 'teacher@example.com',
      password: 'correct-horse-battery',
      role: 'teacher',
    });

    const res = await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newProfile);

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated access to profile routes', async () => {
    const res = await request(app).get('/api/v1/students/profile');
    expect(res.status).toBe(401);
  });

  it('lets a teacher list students in a class, but not a plain student', async () => {
    const studentAccessToken = await registerAndLogin(studentCredentials);
    await request(app)
      .post('/api/v1/students/profile')
      .set('Authorization', `Bearer ${studentAccessToken}`)
      .send(newProfile);

    const teacherAccessToken = await registerAndLogin({
      email: 'teacher2@example.com',
      password: 'correct-horse-battery',
      role: 'teacher',
    });

    const classId = '507f1f77bcf86cd799439011';
    const teacherRes = await request(app)
      .get(`/api/v1/students/class/${classId}`)
      .set('Authorization', `Bearer ${teacherAccessToken}`);
    expect(teacherRes.status).toBe(200);
    expect(teacherRes.body.students).toEqual([]);

    const studentRes = await request(app)
      .get(`/api/v1/students/class/${classId}`)
      .set('Authorization', `Bearer ${studentAccessToken}`);
    expect(studentRes.status).toBe(403);
  });

  it('rejects a parent listing another parent’s linked students', async () => {
    const parentAccessToken = await registerAndLogin({
      email: 'parent@example.com',
      password: 'correct-horse-battery',
      role: 'parent',
    });

    const someoneElsesId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .get(`/api/v1/students/parent/${someoneElsesId}`)
      .set('Authorization', `Bearer ${parentAccessToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects a malformed class id with a validation error', async () => {
    const teacherAccessToken = await registerAndLogin({
      email: 'teacher3@example.com',
      password: 'correct-horse-battery',
      role: 'teacher',
    });

    const res = await request(app)
      .get('/api/v1/students/class/not-an-object-id')
      .set('Authorization', `Bearer ${teacherAccessToken}`);

    expect(res.status).toBe(400);
  });
});
