import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';

describe('notification routes (integration, real Mongo) — a real mastery milestone becomes a visible notification', () => {
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

  async function registerAndLogin(email: string, role: string) {
    const credentials = { email, password: 'correct-horse-battery', role };
    await request(app).post('/api/v1/auth/register').send(credentials);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    return loginRes.body.accessToken as string;
  }

  async function registerLoginAndCreateStudentProfile(email: string) {
    const accessToken = await registerAndLogin(email, 'student');
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

  async function seedPublishedTopicWithQuestion() {
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
        answerKey: { correctOptionId: 'b' },
      });
    const questionId = questionRes.body.question.id as string;
    await request(app)
      .post(`/api/v1/curriculum/questions/${questionId}/publish`)
      .set('Authorization', `Bearer ${token}`);

    return { topicId, questionId };
  }

  async function submitCorrectPracticeAnswer(accessToken: string, topicId: string, questionId: string) {
    const startRes = await request(app)
      .post('/api/v1/practice/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ source: 'self_selected', topicIds: [topicId] });
    const sessionId = startRes.body.session.id as string;

    await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId, studentAnswer: 'b', timeTakenMs: 500, hintsUsedCount: 0 });
  }

  it('turns a real practice submission that crosses the mastery threshold into a visible, unread notification', async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile('ada@example.com');

    await submitCorrectPracticeAnswer(accessToken, topicId, questionId);

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0]).toMatchObject({
      type: 'mastery_milestone',
      payload: { topicId },
      deliveredVia: ['in_app'],
      readAt: null,
    });
  });

  it('marks a single notification as read, and it disappears from the unreadOnly view', async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile('ben@example.com');
    await submitCorrectPracticeAnswer(accessToken, topicId, questionId);

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`);
    const notificationId = listRes.body.notifications[0].id as string;

    const readRes = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.notification.readAt).not.toBeNull();

    const unreadRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ unreadOnly: 'true' });
    expect(unreadRes.body.notifications).toHaveLength(0);
  });

  it('marks all notifications as read via /notifications/read-all', async () => {
    const { topicId: topicA, questionId: questionA } = await seedPublishedTopicWithQuestion();
    const { topicId: topicB, questionId: questionB } = await seedPublishedTopicWithQuestion();
    const accessToken = await registerLoginAndCreateStudentProfile('carla@example.com');

    await submitCorrectPracticeAnswer(accessToken, topicA, questionA);
    await submitCorrectPracticeAnswer(accessToken, topicB, questionB);

    const allRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.updatedCount).toBe(2);

    const unreadRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ unreadOnly: 'true' });
    expect(unreadRes.body.notifications).toHaveLength(0);
  });

  it("rejects marking another student's notification as read", async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion();
    const ownerToken = await registerLoginAndCreateStudentProfile('dana@example.com');
    const intruderToken = await registerLoginAndCreateStudentProfile('eve@example.com');
    await submitCorrectPracticeAnswer(ownerToken, topicId, questionId);

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    const notificationId = listRes.body.notifications[0].id as string;

    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${intruderToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request for the notification inbox', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });
});
