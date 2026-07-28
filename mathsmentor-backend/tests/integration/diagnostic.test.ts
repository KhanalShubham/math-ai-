import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';

describe('diagnostic routes (integration, real Mongo)', () => {
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

  it('starts a diagnostic attempt and returns a first question', async () => {
    await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile();

    const res = await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(201);
    expect(res.body.attempt.status).toBe('in_progress');
    expect(res.body.nextQuestion.difficulty).toBe(3);
    expect(res.body.nextQuestion.answerKey).toBeUndefined();
  });

  it('rejects starting a second attempt while one is in progress', async () => {
    await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile();

    await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${accessToken}`);
    const res = await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(409);
  });

  it('submits an answer, grades it server-side, and completes the attempt', async () => {
    const { topicId } = await seedPublishedTopicWithQuestion('b');
    const accessToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${accessToken}`);
    const attemptId = startRes.body.attempt.id as string;
    const questionId = startRes.body.nextQuestion.id as string;

    const submitRes = await request(app)
      .post(`/api/v1/diagnostic/attempts/${attemptId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId, studentAnswer: 'b', timeTakenMs: 1200, hintRequested: false });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.isCorrect).toBe(true);
    expect(submitRes.body.attempt.items).toHaveLength(1);
    // The client must never see the answer key, even embedded in the attempt's own history.
    expect(submitRes.body.attempt.items[0]).not.toHaveProperty('answerKey');

    const completeRes = await request(app)
      .post(`/api/v1/diagnostic/attempts/${attemptId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.attempt.status).toBe('completed');
    expect(completeRes.body.attempt.finalGradeEstimate).toBeGreaterThanOrEqual(1);
    expect(completeRes.body.attempt.topicBreakdown).toEqual([{ topicId, score: 1 }]);
  });

  it('rejects completing an attempt with no answered items', async () => {
    await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${accessToken}`);
    const attemptId = startRes.body.attempt.id as string;

    const res = await request(app)
      .post(`/api/v1/diagnostic/attempts/${attemptId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it("rejects a student reading another student's diagnostic attempt", async () => {
    await seedPublishedTopicWithQuestion();
    const ownerToken = await registerLoginAndCreateStudentProfile();
    const otherToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${ownerToken}`);
    const attemptId = startRes.body.attempt.id as string;

    const res = await request(app)
      .get(`/api/v1/diagnostic/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects a non-student role starting a diagnostic', async () => {
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
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns null for the current attempt when none is in progress', async () => {
    const accessToken = await registerLoginAndCreateStudentProfile();

    const res = await request(app)
      .get('/api/v1/diagnostic/attempts/current')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.attempt).toBeNull();
  });

  it('rejects submitting an item for a question that does not exist', async () => {
    await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${accessToken}`);
    const attemptId = startRes.body.attempt.id as string;

    const res = await request(app)
      .post(`/api/v1/diagnostic/attempts/${attemptId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        questionId: new mongoose.Types.ObjectId().toString(),
        studentAnswer: 'b',
        timeTakenMs: 100,
        hintRequested: false,
      });

    expect(res.status).toBe(404);
  });
});
