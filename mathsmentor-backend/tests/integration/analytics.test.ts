import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/modules/auth/token.service';
import { STUDENT_EVENTS } from '../../src/modules/student/student.events';
import { PRACTICE_EVENTS } from '../../src/modules/practice/practice.events';
import { TEACHER_EVENTS } from '../../src/modules/teacher/teacher.events';
import { PARENT_EVENTS } from '../../src/modules/parent/parent.events';
import { AnalyticsEventModel } from '../../src/infrastructure/persistence/mongoose/models/analytics-event.model';

describe('analytics routes (integration, real Mongo) — projected from real events', () => {
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
    const accessToken = await registerAndLogin({ email, password: 'correct-horse-battery', role: 'student' });
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

  it("projects a student's registration and profile creation into their analytics timeline", async () => {
    const { studentId } = await registerLoginAndCreateStudentProfile('ada@example.com');

    const res = await request(app)
      .get(`/api/v1/analytics/students/${studentId}/events`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    const body = res.body as { events: Array<{ eventType: string }> };
    const eventTypes = body.events.map((e) => e.eventType);
    expect(eventTypes).toContain(STUDENT_EVENTS.StudentEnrolled);
  });

  it('projects a real practice-item submission with the correctness and topic in its payload', async () => {
    const { topicId, questionId } = await seedPublishedTopicWithQuestion();
    const { accessToken, studentId } = await registerLoginAndCreateStudentProfile('ben@example.com');

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
      .get(`/api/v1/analytics/students/${studentId}/events`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .query({ eventType: PRACTICE_EVENTS.PracticeItemSubmitted });

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0]).toMatchObject({
      eventType: PRACTICE_EVENTS.PracticeItemSubmitted,
      aggregateType: 'Question',
      aggregateId: questionId,
      studentId,
      payload: { topicId, isCorrect: true },
    });
  });

  it('projects teacher enrollment and parent linking events scoped to the student', async () => {
    const schoolId = (
      await request(app)
        .post('/api/v1/teacher/schools')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          name: 'Springfield High',
          subscriptionTier: 'standard',
          contactEmail: 'admin@springfield.example',
        })
    ).body.school.id as string;

    const teacherToken = await registerAndLogin({
      email: 'teacher@example.com',
      password: 'correct-horse-battery',
      role: 'teacher',
    });
    await request(app)
      .post('/api/v1/teacher/profile')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ schoolId, subjects: ['Maths'] });

    const classRes = await request(app)
      .post('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ schoolId, name: 'Year 10 Foundation B', examBoard: 'AQA', tier: 'foundation', academicYear: '2025/26' });
    const classId = classRes.body.class.id as string;

    const { studentId } = await registerLoginAndCreateStudentProfile('carla@example.com');
    await request(app)
      .post(`/api/v1/teacher/classes/${classId}/students`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId });

    const parentToken = await registerAndLogin({
      email: 'parent@example.com',
      password: 'correct-horse-battery',
      role: 'parent',
    });
    await request(app).post('/api/v1/parent/profile').set('Authorization', `Bearer ${parentToken}`);
    await request(app)
      .post('/api/v1/parent/links')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentEmail: 'carla@example.com' });

    const res = await request(app)
      .get(`/api/v1/analytics/students/${studentId}/events`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    const body = res.body as { events: Array<{ eventType: string }> };
    const eventTypes = body.events.map((e) => e.eventType);
    expect(eventTypes).toContain(TEACHER_EVENTS.StudentEnrolledInClass);
    expect(eventTypes).toContain(PARENT_EVENTS.StudentLinked);
  });

  it('counts events by type via /analytics/events/count', async () => {
    await registerLoginAndCreateStudentProfile('dana@example.com');
    await registerLoginAndCreateStudentProfile('eve@example.com');

    const res = await request(app)
      .get('/api/v1/analytics/events/count')
      .set('Authorization', `Bearer ${adminToken()}`)
      .query({ eventType: STUDENT_EVENTS.StudentEnrolled });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('rejects a non-admin reading a student analytics timeline', async () => {
    const { accessToken, studentId } = await registerLoginAndCreateStudentProfile('frank@example.com');

    const res = await request(app)
      .get(`/api/v1/analytics/students/${studentId}/events`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects a non-admin reading the event-type count', async () => {
    const { accessToken } = await registerLoginAndCreateStudentProfile('grace@example.com');

    const res = await request(app)
      .get('/api/v1/analytics/events/count')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ eventType: STUDENT_EVENTS.StudentEnrolled });

    expect(res.status).toBe(403);
  });

  it('enforces an 18-month TTL delete on AnalyticsEvent via a real Mongo TTL index (AD-013)', async () => {
    const indexes = await AnalyticsEventModel.collection.indexes();
    const ttlIndex = indexes.find((index) => index.key?.occurredAt === 1 && 'expireAfterSeconds' in index);

    expect(ttlIndex).toBeDefined();
    expect(ttlIndex?.expireAfterSeconds).toBe(18 * 30 * 24 * 60 * 60);
  });
});
