import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';

describe('mastery (integration, real Mongo) — projected from Practice/Diagnostic events', () => {
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

  it('returns an empty mastery list before any practice or diagnostic activity', async () => {
    const accessToken = await registerLoginAndCreateStudentProfile();

    const res = await request(app)
      .get('/api/v1/students/mastery')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mastery).toEqual([]);
  });

  it('projects a mastery record from a real practice-item submission', async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion('b');
    const accessToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });
    const sessionId = startRes.body.session.id as string;

    await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId, studentAnswer: 'b', timeTakenMs: 500, hintsUsedCount: 0 });

    const res = await request(app)
      .get('/api/v1/students/mastery')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mastery).toHaveLength(1);
    expect(res.body.mastery[0]).toMatchObject({
      topicId,
      masteryScore: 1,
      attemptsCount: 1,
      correctCount: 1,
      trend: 'stable',
    });
  });

  it('projects mastery records for every topic in a completed diagnostic', async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion('b');
    const accessToken = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/diagnostic/attempts')
      .set('Authorization', `Bearer ${accessToken}`);
    const attemptId = startRes.body.attempt.id as string;

    await request(app)
      .post(`/api/v1/diagnostic/attempts/${attemptId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId, studentAnswer: 'b', timeTakenMs: 1000, hintRequested: false });
    await request(app)
      .post(`/api/v1/diagnostic/attempts/${attemptId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);

    const res = await request(app)
      .get('/api/v1/students/mastery')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mastery).toHaveLength(1);
    expect(res.body.mastery[0].topicId).toBe(topicId);
    expect(res.body.mastery[0].masteryScore).toBe(1); // 100% correct in the breakdown
  });

  it("does not leak one student's mastery into another student's read", async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion('b');
    const accessTokenA = await registerLoginAndCreateStudentProfile();
    const accessTokenB = await registerLoginAndCreateStudentProfile();

    const startRes = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ source: 'self_selected', topicIds: [topicId] });
    const sessionId = startRes.body.session.id as string;
    await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/items`)
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ questionId, studentAnswer: 'b', timeTakenMs: 500, hintsUsedCount: 0 });

    const resB = await request(app)
      .get('/api/v1/students/mastery')
      .set('Authorization', `Bearer ${accessTokenB}`);

    expect(resB.body.mastery).toEqual([]);
  });

  it('rejects a non-student role reading mastery', async () => {
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
      .get('/api/v1/students/mastery')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(403);
  });
});
