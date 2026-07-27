import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';

describe('auth routes (integration, real Mongo)', () => {
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

  const credentials = {
    email: 'student@example.com',
    password: 'correct-horse-battery',
    role: 'student',
  };

  it('registers, logs in, hits a protected route, refreshes, and logs out end to end', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(credentials);
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.email).toBe(credentials.email);
    expect(typeof registerRes.body.emailVerificationToken).toBe('string');

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.accessToken as string;
    const refreshCookie = loginRes.headers['set-cookie'] as string;
    expect(accessToken).toBeTruthy();
    expect(refreshCookie).toBeTruthy();

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.role).toBe('student');

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);
    expect(refreshRes.status).toBe(200);
    expect(typeof refreshRes.body.accessToken).toBe('string');
    const rotatedCookie = refreshRes.headers['set-cookie'] as string;

    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', rotatedCookie);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogoutRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookie);
    expect(refreshAfterLogoutRes.status).toBe(401);
  });

  it('rejects protected routes with no Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects registration with a password shorter than the minimum length', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'short@example.com', password: 'short', role: 'student' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects registration with a malformed email address', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'correct-horse-battery', role: 'student' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects registration with a role outside the self-registration allow-list', async () => {
    // admin is a valid UserRole but must never be reachable via self-registration
    // (ARCHITECTURE.md/auth.validation.ts — admins are provisioned out-of-band).
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'wannabeadmin@example.com',
      password: 'correct-horse-battery',
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects registration with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'incomplete@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a login request missing the password field', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: credentials.email });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an access token with a tampered signature', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const accessToken = loginRes.body.accessToken as string;
    const tampered = accessToken.slice(0, -2) + (accessToken.endsWith('a') ? 'bb' : 'aa');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('logout-all revokes every session for that user across two separate logins', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);

    const loginA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const loginB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const cookieA = loginA.headers['set-cookie'] as string;
    const cookieB = loginB.headers['set-cookie'] as string;
    const accessTokenA = loginA.body.accessToken as string;

    const logoutAllRes = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(logoutAllRes.status).toBe(204);

    const refreshA = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookieA);
    const refreshB = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookieB);
    expect(refreshA.status).toBe(401);
    expect(refreshB.status).toBe(401);
  });

  it('rejects a duplicate registration with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);
    const res = await request(app).post('/api/v1/auth/register').send(credentials);
    expect(res.status).toBe(409);
  });

  it('completes the email verification flow', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(credentials);
    const token = registerRes.body.emailVerificationToken as string;

    const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(verifyRes.status).toBe(200);

    const badVerifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'not-a-real-token' });
    expect(badVerifyRes.status).toBe(401);
  });

  it('always returns 200 for password reset requests regardless of whether the email exists', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);

    const existingRes = await request(app)
      .post('/api/v1/auth/request-password-reset')
      .send({ email: credentials.email });
    const missingRes = await request(app)
      .post('/api/v1/auth/request-password-reset')
      .send({ email: 'nobody@example.com' });

    expect(existingRes.status).toBe(200);
    expect(missingRes.status).toBe(200);
    expect(existingRes.body).toEqual(missingRes.body);
  });

  it('rejects a password reset over HTTP with an invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'a-brand-new-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});
