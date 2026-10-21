import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { env } from '../config/env.js';
import { User, Ticket, TicketMessage, EmailEvent } from '../database/index.js';

describe('BitMax Production Ticketing System - Full Test Suite', () => {
  let customerToken = '';
  let customerId = '';
  let agentToken = '';
  let agentId = '';
  let adminToken = '';
  let createdTicketId = '';
  let createdTicketNumber = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongoUri);
    }
  });

  afterAll(async () => {
    // cleanup
  });

  describe('1. Authentication Flow', () => {
    const testEmail = `test.user.${Date.now()}@example.com`;
    let registrationOtp = '';

    it('should register a new user and return OTP in dev mode', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Automated Tester',
        email: testEmail,
        phone: '+91 9999988888',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.devOtp).toBeDefined();
      registrationOtp = res.body.data.devOtp;
    });

    it('should verify OTP and issue JWT access and refresh tokens', async () => {
      const res = await request(app).post('/api/auth/verify-otp').send({
        email: testEmail,
        otp: registrationOtp,
        type: 'register',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user.isVerified).toBe(true);
      customerToken = res.body.data.tokens.accessToken;
      customerId = res.body.data.user.id;
    });

    it('should login seeded agent with password', async () => {
      const res = await request(app).post('/api/auth/login-password').send({
        email: 'sarah.agent@bitmax.local',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('agent');
      agentToken = res.body.data.tokens.accessToken;
      agentId = res.body.data.user.id;
    });

    it('should login seeded admin with password', async () => {
      const res = await request(app).post('/api/auth/login-password').send({
        email: 'admin@bitmax.local',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('admin');
      adminToken = res.body.data.tokens.accessToken;
    });
  });

  describe('2. Ticket Creation and RBAC', () => {
    it('should allow authenticated customer to create a ticket with TKT number', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subject: 'Payment failed for invoice #9921',
          description: 'Our card was charged but the invoice shows unpaid.',
          category: 'Billing & Invoicing',
          priority: 'high',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(res.body.data.status).toBe('open');
      createdTicketId = res.body.data._id;
      createdTicketNumber = res.body.data.ticketNumber;
    });

    it('customer can list their own tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((t) => t._id === createdTicketId)).toBe(true);
    });
  });

  describe('3. Ticket Assignment and Workflow Lifecycle', () => {
    it('agent can assign ticket to themselves', async () => {
      const res = await request(app)
        .post(`/api/tickets/${createdTicketId}/assign`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ agentId });

      expect(res.status).toBe(200);
      expect(res.body.data.assignedTo).toBe(agentId);
    });

    it('agent can add an internal note', async () => {
      const res = await request(app)
        .post(`/api/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          body: 'Internal audit: checking Stripe payment gateway logs.',
          type: 'internal',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('internal');
    });

    it('customer CANNOT see internal notes in conversation', async () => {
      const res = await request(app)
        .get(`/api/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      const internalNotes = res.body.data.filter((m) => m.type === 'internal');
      expect(internalNotes.length).toBe(0);
    });

    it('agent CAN see internal notes in conversation', async () => {
      const res = await request(app)
        .get(`/api/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      const internalNotes = res.body.data.filter((m) => m.type === 'internal');
      expect(internalNotes.length).toBeGreaterThanOrEqual(1);
    });

    it('agent can resolve ticket', async () => {
      const res = await request(app)
        .post(`/api/tickets/${createdTicketId}/resolve`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ reason: 'Reconciled in payment processor' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
    });
  });

  describe('4. Inbound Email Processing & Reopen Workflow', () => {
    const inboundMessageId = `<inbound-test-${Date.now()}@mail.example.com>`;

    it('should process inbound email reply and reopen resolved ticket', async () => {
      const res = await request(app)
        .post('/api/email/inbound')
        .send({
          from: 'john.doe@example.com',
          senderName: 'John Doe',
          to: `support+${createdTicketNumber}@bitmax.local`,
          subject: `Re: [${createdTicketNumber}] Payment failed for invoice #9921`,
          body: 'Still having an issue with the charge. Could you double check?',
          messageId: inboundMessageId,
          headers: {
            'x-ticket-number': createdTicketNumber,
            references: `<ticket-${createdTicketNumber}@bitmax.local>`,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.reopened).toBe(true);

      // Verify ticket is now reopened
      const ticketRes = await request(app)
        .get(`/api/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${agentToken}`);
      expect(ticketRes.body.data.status).toBe('reopened');
    });

    it('should detect duplicate email and safely ignore without error', async () => {
      const res = await request(app)
        .post('/api/email/inbound')
        .send({
          from: 'john.doe@example.com',
          subject: `Re: [${createdTicketNumber}] Payment failed`,
          body: 'Duplicate test',
          messageId: inboundMessageId, // Same messageId
          headers: {
            'x-ticket-number': createdTicketNumber,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.data.status).toBe('duplicate');
    });
  });

  describe('5. Dashboard and Activity Audit', () => {
    it('should return complete dashboard metrics for agent', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.byPriority).toBeDefined();
      expect(res.body.data.recentActivity.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve chronological activity timeline for ticket', async () => {
      const res = await request(app)
        .get(`/api/tickets/${createdTicketId}/activity`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });
});
