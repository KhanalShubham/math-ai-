import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';

describe('unmatched routes', () => {
  const app = createApp(createContainer());

  it('returns the standard JSON error contract instead of Express default HTML 404', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    const body = res.body as { error: { code: string; message: string } };

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
