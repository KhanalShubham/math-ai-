import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';

describe('curriculum routes (integration, real Mongo)', () => {
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

  // Admin accounts are provisioned out-of-band (never self-registered) — a
  // real integration test therefore mints the token directly rather than
  // going through /auth/register, matching how requireAuth actually verifies
  // callers (JWT signature only, no DB round trip).
  function adminToken(): string {
    return signAccessToken({ sub: new mongoose.Types.ObjectId().toString(), role: 'admin' });
  }

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

  const newTopic = {
    name: 'Simplifying fractions',
    examBoard: 'AQA',
    tier: 'foundation',
    gradeBand: [3, 4, 5],
  };

  const newQuestion = (topicId: string) => ({
    topicId,
    type: 'numeric',
    difficulty: 3,
    promptText: 'What is 1/2 + 1/4?',
    answerKey: { value: 0.75, tolerance: 0.001 },
  });

  it('lets an admin create, fetch, and publish a topic', async () => {
    const token = adminToken();

    const createRes = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send(newTopic);
    expect(createRes.status).toBe(201);
    expect(createRes.body.topic.status).toBe('draft');
    const topicId = createRes.body.topic.id as string;

    const publishRes = await request(app)
      .post(`/api/v1/curriculum/topics/${topicId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(publishRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/curriculum/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.topic.status).toBe('published');
  });

  it('rejects a non-admin creating a topic', async () => {
    const token = await registerAndLogin({
      email: 'student1@example.com',
      password: 'correct-horse-battery',
      role: 'student',
    });

    const res = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send(newTopic);

    expect(res.status).toBe(403);
  });

  it('lets any authenticated role list and read topics', async () => {
    const adminAccessToken = adminToken();
    await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(newTopic);

    const studentAccessToken = await registerAndLogin({
      email: 'student2@example.com',
      password: 'correct-horse-battery',
      role: 'student',
    });

    const res = await request(app)
      .get('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${studentAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.topics).toHaveLength(1);
  });

  it('rejects a prerequisite link that would create a cycle, with 409', async () => {
    const token = adminToken();

    const a = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send(newTopic);
    const b = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...newTopic, name: 'Adding fractions' });

    const aId = a.body.topic.id as string;
    const bId = b.body.topic.id as string;

    const addRes = await request(app)
      .post(`/api/v1/curriculum/topics/${bId}/prerequisites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prerequisiteTopicId: aId });
    expect(addRes.status).toBe(200);

    const cycleRes = await request(app)
      .post(`/api/v1/curriculum/topics/${aId}/prerequisites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prerequisiteTopicId: bId });
    expect(cycleRes.status).toBe(409);
  });

  it('creates a question, hides answerKey from the public endpoint, and shows it on the internal admin endpoint', async () => {
    const token = adminToken();

    const topicRes = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send(newTopic);
    const topicId = topicRes.body.topic.id as string;

    const createRes = await request(app)
      .post('/api/v1/curriculum/questions')
      .set('Authorization', `Bearer ${token}`)
      .send(newQuestion(topicId));
    expect(createRes.status).toBe(201);
    expect(createRes.body.question.answerKey).toBeUndefined();
    const questionId = createRes.body.question.id as string;

    const publicRes = await request(app)
      .get(`/api/v1/curriculum/questions/${questionId}/public`)
      .set('Authorization', `Bearer ${token}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.question.answerKey).toBeUndefined();

    const internalRes = await request(app)
      .get(`/api/v1/curriculum/questions/${questionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(internalRes.status).toBe(200);
    expect(internalRes.body.question.answerKey).toEqual({ value: 0.75, tolerance: 0.001 });
  });

  it('rejects a non-admin reading the internal question endpoint', async () => {
    const token = adminToken();
    const topicRes = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send(newTopic);
    const createRes = await request(app)
      .post('/api/v1/curriculum/questions')
      .set('Authorization', `Bearer ${token}`)
      .send(newQuestion(topicRes.body.topic.id as string));
    const questionId = createRes.body.question.id as string;

    const studentAccessToken = await registerAndLogin({
      email: 'student3@example.com',
      password: 'correct-horse-battery',
      role: 'student',
    });

    const res = await request(app)
      .get(`/api/v1/curriculum/questions/${questionId}`)
      .set('Authorization', `Bearer ${studentAccessToken}`);

    expect(res.status).toBe(403);
  });

  it('only returns published questions within the requested difficulty range for a topic', async () => {
    const token = adminToken();
    const topicRes = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send(newTopic);
    const topicId = topicRes.body.topic.id as string;

    const draftQ = await request(app)
      .post('/api/v1/curriculum/questions')
      .set('Authorization', `Bearer ${token}`)
      .send(newQuestion(topicId));
    const publishedQ = await request(app)
      .post('/api/v1/curriculum/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...newQuestion(topicId), difficulty: 5 });
    await request(app)
      .post(`/api/v1/curriculum/questions/${publishedQ.body.question.id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    void draftQ;

    const res = await request(app)
      .get(`/api/v1/curriculum/questions?topicId=${topicId}&minDifficulty=4&maxDifficulty=5`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].id).toBe(publishedQ.body.question.id);
    expect(res.body.questions[0].answerKey).toBeUndefined();
  });

  it('rejects question creation for a topic that does not exist', async () => {
    const token = adminToken();
    const res = await request(app)
      .post('/api/v1/curriculum/questions')
      .set('Authorization', `Bearer ${token}`)
      .send(newQuestion(new mongoose.Types.ObjectId().toString()));

    expect(res.status).toBe(404);
  });

  it('rejects a malformed answerKey shape with a validation error', async () => {
    const token = adminToken();
    const topicRes = await request(app)
      .post('/api/v1/curriculum/topics')
      .set('Authorization', `Bearer ${token}`)
      .send(newTopic);

    const res = await request(app)
      .post('/api/v1/curriculum/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        topicId: topicRes.body.topic.id,
        type: 'numeric',
        difficulty: 3,
        promptText: 'Broken',
        answerKey: { notAValidShape: true },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
