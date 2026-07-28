import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';

describe('practice routes (integration, real Mongo)', () => {
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

  async function registerLoginAndCreateStudentProfile() {
    const credentials = {
      email: `student-${Math.random()}@example.com`,
      password: 'correct-horse-battery',
      role: 'student',
    };
    await request(app).post('/api/v1/auth/register').send(credentials);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const accessToken = loginRes.body.accessToken as string;

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

  async function seedPublishedTopicWithQuestion(correctOptionId = 'b') {
    const token = adminToken();
    const topicRes = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fractions', examBoard: 'AQA', tier: 'foundation', gradeBand: [3, 4, 5] });
    const topicId = topicRes.body.topic.id as string;
    await request(app)
      .post(`/api/v1/curriculum/topics/${topicId}/publish`)
      .set('Authorization', `Bearer ${token}`);

    const questionRes = await request(app)
      .post('/api/v1/curriculum/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        topicId,
        type: 'mcq',
        difficulty: 3,
        promptText: 'What is 1/2 + 1/4?',
        answerKey: { correctOptionId },
      });
    const questionId = questionRes.body.question.id as string;
    await request(app)
      .post(`/api/v1/curriculum/questions/${questionId}/publish`)
      .set('Authorization', `Bearer ${token}`);

    return { topicId, questionId };
  }

  it('starts a self-selected practice session', async () => {
    const { topicId } = await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile();

    const res = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });

    expect(res.status).toBe(201);
    expect(res.body.session.source).toBe('self_selected');
    expect(res.body.session.completedAt).toBeNull();
  });

  it('rejects a student self-declaring a teacher_assigned session', async () => {
    const { topicId } = await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile();

    const res = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'teacher_assigned', topicIds: [topicId] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows starting a second session while one is already in progress', async () => {
    const { topicId } = await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile();

    await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });
    const res = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });

    expect(res.status).toBe(201);
  });

  it('submits an answer, grades it server-side, and completes the session', async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion('b');
    const accessToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });
    const sessionId = startRes.body.session.id as string;

    const submitRes = await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId, studentAnswer: 'b', timeTakenMs: 900, hintsUsedCount: 0 });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.isCorrect).toBe(true);
    expect(submitRes.body.session.items).toHaveLength(1);
    expect(submitRes.body.session.items[0]).not.toHaveProperty('answerKey');

    const completeRes = await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.session.completedAt).not.toBeNull();
  });

  it('rejects submitting a question outside the session topics', async () => {
    const accessToken = await registerLoginAndCreateStudentProfile();
    const { topicId: sessionTopicId } = await seedPublishedTopicWithQuestion('b');
    const { questionId: otherTopicQuestionId } = await seedPublishedTopicWithQuestion('c');

    const startRes = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [sessionTopicId] });
    const sessionId = startRes.body.session.id as string;

    const res = await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId: otherTopicQuestionId, studentAnswer: 'c', timeTakenMs: 100, hintsUsedCount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it("rejects a student reading another student's practice session", async () => {
    const { topicId } = await seedPublishedTopicWithQuestion();
    const ownerToken = await registerLoginAndCreateStudentProfile();
    const otherToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });
    const sessionId = startRes.body.session.id as string;

    const res = await request(app)
      .get(`/api/v1/practice/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('returns null for the current session when none is in progress', async () => {
    const accessToken = await registerLoginAndCreateStudentProfile();

    const res = await request(app)
      .get('/api/v1/practice/sessions/current')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.session).toBeNull();
  });

  it('rejects a non-student role starting a practice session', async () => {
    const { topicId } = await seedPublishedTopicWithQuestion();
    const teacherCredentials = {
      email: 'teacher@example.com',
      password: 'correct-horse-battery',
      role: 'teacher',
    };
    await request(app).post('/api/v1/auth/register').send(teacherCredentials);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: teacherCredentials.email, password: teacherCredentials.password });

    const res = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });

    expect(res.status).toBe(403);
  });

  it('rejects starting a session with an empty topicIds array', async () => {
    const accessToken = await registerLoginAndCreateStudentProfile();

    const res = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
