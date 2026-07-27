import request from 'supertest';
import { createApp } from '../../src/app';
import { createContainer } from '../../src/container/container';

describe('observability endpoints', () => {
  const app = createApp(createContainer());

  it('GET /health returns 200 without checking dependencies', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /ready reports not_ready when Mongo/Redis are not connected', async () => {
    const res = await request(app).get('/ready');
    const body = res.body as { status: string; checks: Record<string, boolean> };

    expect(res.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.checks).toEqual({ mongo: false, redis: false });
  });

  it('GET /metrics returns Prometheus-format text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
