import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User, Ticket, TicketMessage, EmailEvent } from '../database/index.js';
import { emailService } from '../services/email.service.js';
import { smsService } from '../services/sms.service.js';

const waitFor = async (findResult, timeoutMs = 3000) => {
  const deadline = Date.now() + timeoutMs;
  let result = await findResult();

  while (!result && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    result = await findResult();
  }

  return result;
};

describe('BitMax Production Ticketing System - Full Test Suite', () => {
  const emailProviderConfig = {
    gmailUser: env.email.gmailUser,
    gmailAppPassword: env.email.gmailAppPassword,
    appsScriptUrl: env.email.appsScriptUrl,
    appsScriptSecret: env.email.appsScriptSecret,
  };
  let customerToken = '';
  let customerId = '';
  let agentToken = '';
  let agentId = '';
  let adminToken = '';
  let createdTicketId = '';
  let createdTicketNumber = '';

  beforeAll(async () => {
    env.email.gmailUser = '';
    env.email.gmailAppPassword = '';
    env.email.appsScriptUrl = '';
    env.email.appsScriptSecret = '';

    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
  }, 15000);

  afterAll(async () => {
    await mongoose.disconnect();
    Object.assign(env.email, emailProviderConfig);
  });

  describe('1. Authentication Flow', () => {
    const testEmail = `test.user.${Date.now()}@example.com`;
    let registrationOtp = '';

    it('should register a new user without exposing the OTP in the response', async () => {
      const otpSpy = vi.spyOn(emailService, 'queueOTP');
      const smsSpy = vi.spyOn(smsService, 'sendPhoneOTP');
      try {
        const res = await request(app).post('/api/auth/register').send({
          name: 'Automated Tester',
          email: testEmail,
          phone: '+91 9999988888',
          password: 'Password123!',
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.devOtp).toBeUndefined();
        expect(smsSpy).not.toHaveBeenCalled();
        registrationOtp = otpSpy.mock.calls[0][2];
      } finally {
        otpSpy.mockRestore();
        smsSpy.mockRestore();
      }
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

    it('should return a mobile login OTP without calling SMS or email providers', async () => {
      const smsSpy = vi.spyOn(smsService, 'sendPhoneOTP');
      const emailSpy = vi.spyOn(emailService, 'queueOTP');

      try {
        const res = await request(app)
          .post('/api/auth/login-otp')
          .send({ phone: '+91 9999988888' });

        expect(res.status).toBe(200);
        expect(res.body.data.testOtp).toMatch(/^\d{6}$/);
        expect(smsSpy).not.toHaveBeenCalled();
        expect(emailSpy).not.toHaveBeenCalled();
      } finally {
        smsSpy.mockRestore();
        emailSpy.mockRestore();
      }
    });

    it('should return a phone verification OTP without calling an SMS provider', async () => {
      const smsSpy = vi.spyOn(smsService, 'sendPhoneOTP');

      try {
        const res = await request(app)
          .post('/api/auth/phone/send-otp')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ phone: '+91 9999988888' });

        expect(res.status).toBe(200);
        expect(res.body.data.testOtp).toMatch(/^\d{6}$/);
        expect(smsSpy).not.toHaveBeenCalled();
      } finally {
        smsSpy.mockRestore();
      }
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

      const initialMessage = await TicketMessage.findOne({ ticketId: createdTicketId });
      expect(initialMessage.body).toContain('Our card was charged');

      const ticket = await Ticket.findById(createdTicketId).populate('assignedTo', 'email');
      const confirmationEmail = await waitFor(() =>
        EmailEvent.findOne({
          ticketId: createdTicketId,
          direction: 'outbound',
          'payload.to': ticket.requesterEmail,
        })
      );
      expect(confirmationEmail).toBeTruthy();

      const assignmentEmail = await waitFor(() =>
        EmailEvent.findOne({
          ticketId: createdTicketId,
          direction: 'outbound',
          'payload.to': ticket.assignedTo.email,
          'payload.subject': { $regex: /New ticket assigned to you/ },
        })
      );
      expect(assignmentEmail).toBeTruthy();
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

    it('emails public agent replies to the requester', async () => {
      const ticket = await Ticket.findById(createdTicketId);
      const res = await request(app)
        .post(`/api/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          body: 'We are investigating the payment issue.',
          type: 'public',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.source).toBe('web');

      const replyEmail = await waitFor(() =>
        EmailEvent.findOne({
          ticketId: createdTicketId,
          direction: 'outbound',
          'payload.to': ticket.requesterEmail,
          'payload.subject': { $regex: /New reply on your ticket/ },
        })
      );
      expect(replyEmail).toBeTruthy();
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
      const ticket = await Ticket.findById(createdTicketId);
      const res = await request(app)
        .post('/api/email/inbound')
        .send({
          from: ticket.requesterEmail,
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

      const storedMessage = await TicketMessage.findOne({ emailMessageId: inboundMessageId });
      expect(storedMessage.body).toContain('Still having an issue');
      expect(storedMessage.source).toBe('email');

      const assignedAgent = await User.findById(ticket.assignedTo);
      const agentNotification = await waitFor(() =>
        EmailEvent.findOne({
          ticketId: createdTicketId,
          direction: 'outbound',
          'payload.to': assignedAgent.email,
          'payload.subject': { $regex: /New reply on your ticket/ },
        })
      );
      expect(agentNotification).toBeTruthy();

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

    it('customer CANNOT see internal_note_added in activity timeline', async () => {
      const res = await request(app)
        .get(`/api/tickets/${createdTicketId}/activity`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      const hasInternalNote = res.body.data.some((a) => a.action === 'internal_note_added');
      expect(hasInternalNote).toBe(false);
    });

    it('customer dashboard summary scopes recent activities to customer own tickets without internal notes', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics).toBeDefined();
      const hasInternalNote = res.body.data.recentActivity.some((a) => a.action === 'internal_note_added');
      expect(hasInternalNote).toBe(false);
    });
  });
});
