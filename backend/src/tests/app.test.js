import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { env } from '../config/env.js';

describe('API root endpoint', () => {
  it('confirms the API is running and points to health and docs endpoints', async () => {
    env.serveFrontend = false;
    const { default: app } = await import('../app.js');
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Ticketing API is running',
      health: '/api/health',
      docs: '/api/docs',
    });
  });
});
