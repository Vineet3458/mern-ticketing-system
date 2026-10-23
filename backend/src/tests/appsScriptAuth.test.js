import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { env } from '../config/env.js';

describe('Apps Script inbound authentication', () => {
  const originalSecret = env.email.appsScriptSecret;

  afterEach(() => {
    env.email.appsScriptSecret = originalSecret;
  });

  it('rejects a missing shared secret before processing an inbound message', async () => {
    env.email.appsScriptSecret = 'expected-shared-secret';

    const response = await request(app).post('/api/email/inbound/apps-script').send({
      from: 'requester@example.com',
      subject: 'Ticket reply',
      body: 'Reply',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid Apps Script credentials');
  });

  it('rejects an incorrect shared secret before processing an inbound message', async () => {
    env.email.appsScriptSecret = 'expected-shared-secret';

    const response = await request(app)
      .post('/api/email/inbound/apps-script')
      .send({ secret: 'incorrect-secret' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid Apps Script credentials');
  });
});
