import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import {
  User,
  Category,
  Ticket,
  TicketMessage,
  TicketActivity,
  Counter,
} from './index.js';
import {
  ROLES,
  TICKET_STATUS,
  TICKET_PRIORITY,
  MESSAGE_TYPE,
  MESSAGE_SOURCE,
} from '../constants/index.js';
import { logger } from '../utils/logger.js';

const seedDatabase = async () => {
  logger.info('Connecting to database for seeding...');
  await mongoose.connect(env.mongoUri);

  logger.info('Clearing existing test data...');
  try {
    await TicketMessage.collection.dropIndexes();
  } catch {
    // collection may not exist yet
  }
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Ticket.deleteMany({}),
    TicketMessage.deleteMany({}),
    TicketActivity.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  logger.info('Seeding categories...');
  const categories = await Category.insertMany([
    { name: 'Technical Support', description: 'Infrastructure, bugs, and API integration issues', isActive: true },
    { name: 'Billing & Invoicing', description: 'Payment processing, subscriptions, and receipts', isActive: true },
    { name: 'Account & Security', description: 'Password reset, 2FA, OTP and authorization access', isActive: true },
    { name: 'General Inquiries', description: 'General product questions and onboarding assistance', isActive: true },
    { name: 'Feature Request', description: 'Enhancement suggestions and product feedback', isActive: true },
  ]);

  logger.info('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('Password123!', salt);

  const [admin, agent1, agent2, customer1, customer2] = await User.insertMany([
    {
      name: 'System Administrator',
      email: 'admin@bitmax.local',
      phone: '+91 9876543210',
      passwordHash: commonPasswordHash,
      role: ROLES.ADMIN,
      isVerified: true,
    },
    {
      name: 'Sarah Jenkins',
      email: 'sarah.agent@bitmax.local',
      phone: '+91 9876543211',
      passwordHash: commonPasswordHash,
      role: ROLES.AGENT,
      isVerified: true,
    },
    {
      name: 'David Chen',
      email: 'david.agent@bitmax.local',
      phone: '+91 9876543212',
      passwordHash: commonPasswordHash,
      role: ROLES.AGENT,
      isVerified: true,
    },
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91 9876543213',
      passwordHash: commonPasswordHash,
      role: ROLES.CUSTOMER,
      isVerified: true,
    },
    {
      name: 'Emma Watson',
      email: 'emma.watson@example.com',
      phone: '+91 9876543214',
      passwordHash: commonPasswordHash,
      role: ROLES.CUSTOMER,
      isVerified: true,
    },
  ]);

  logger.info('Seeding tickets and conversations...');

  // Ticket 1: In Progress, assigned to Sarah
  const ticket1 = await Ticket.create({
    ticketNumber: 'TKT-2026-000001',
    subject: 'Production Database Connection Timeout Errors',
    description: 'We are experiencing intermittent timeout errors connecting to the cluster during high traffic periods.',
    requesterId: customer1._id,
    requesterEmail: customer1.email,
    assignedTo: agent1._id,
    assignedAt: new Date(Date.now() - 3 * 3600 * 1000),
    category: 'Technical Support',
    priority: TICKET_PRIORITY.URGENT,
    status: TICKET_STATUS.IN_PROGRESS,
    slaDueDate: new Date(Date.now() + 2 * 3600 * 1000),
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000),
  });

  await TicketMessage.insertMany([
    {
      ticketId: ticket1._id,
      senderId: customer1._id,
      senderEmail: customer1.email,
      senderName: customer1.name,
      senderRole: ROLES.CUSTOMER,
      type: MESSAGE_TYPE.PUBLIC,
      body: 'We are experiencing intermittent timeout errors connecting to the cluster during high traffic periods.',
      source: MESSAGE_SOURCE.WEB,
      createdAt: new Date(Date.now() - 4 * 3600 * 1000),
    },
    {
      ticketId: ticket1._id,
      senderId: agent1._id,
      senderEmail: agent1.email,
      senderName: agent1.name,
      senderRole: ROLES.AGENT,
      type: MESSAGE_TYPE.INTERNAL,
      body: 'Investigating connection pool metrics in Datadog. Current pool utilization is peaking at 98%.',
      source: MESSAGE_SOURCE.WEB,
      createdAt: new Date(Date.now() - 2 * 3600 * 1000),
    },
    {
      ticketId: ticket1._id,
      senderId: agent1._id,
      senderEmail: agent1.email,
      senderName: agent1.name,
      senderRole: ROLES.AGENT,
      type: MESSAGE_TYPE.PUBLIC,
      body: 'Hello John, we have identified connection pooling saturation. We are increasing pool maximums from 50 to 150 right now.',
      source: MESSAGE_SOURCE.WEB,
      createdAt: new Date(Date.now() - 1 * 3600 * 1000),
    },
    {
      ticketId: ticket1._id,
      senderId: customer1._id,
      senderEmail: customer1.email,
      senderName: customer1.name,
      senderRole: ROLES.CUSTOMER,
      type: MESSAGE_TYPE.PUBLIC,
      body: 'Thank you Sarah! We are monitoring error rates on our dashboard now.',
      source: MESSAGE_SOURCE.EMAIL,
      emailMessageId: '<email_sim_reply_001@example.com>',
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  ]);

  await TicketActivity.insertMany([
    {
      ticketId: ticket1._id,
      actorId: customer1._id,
      actorName: customer1.name,
      action: 'ticket_created',
      newValue: ticket1.ticketNumber,
      createdAt: new Date(Date.now() - 4 * 3600 * 1000),
    },
    {
      ticketId: ticket1._id,
      actorId: admin._id,
      actorName: admin.name,
      action: 'ticket_assigned',
      oldValue: 'Unassigned',
      newValue: agent1.name,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
    {
      ticketId: ticket1._id,
      actorId: agent1._id,
      actorName: agent1.name,
      action: 'status_changed',
      oldValue: 'open',
      newValue: 'in_progress',
      createdAt: new Date(Date.now() - 2.5 * 3600 * 1000),
    },
  ]);

  // Ticket 2: Open, unassigned
  const ticket2 = await Ticket.create({
    ticketNumber: 'TKT-2026-000002',
    subject: 'Request for Monthly Billing Invoice and VAT Receipt',
    description: 'Please provide the invoice for the annual subscription paid on October 1st including our corporate VAT registration number.',
    requesterId: customer2._id,
    requesterEmail: customer2.email,
    assignedTo: null,
    category: 'Billing & Invoicing',
    priority: TICKET_PRIORITY.MEDIUM,
    status: TICKET_STATUS.OPEN,
    slaDueDate: new Date(Date.now() + 20 * 3600 * 1000),
    lastMessageAt: new Date(Date.now() - 50 * 60 * 1000),
  });

  await TicketMessage.create({
    ticketId: ticket2._id,
    senderId: customer2._id,
    senderEmail: customer2.email,
    senderName: customer2.name,
    senderRole: ROLES.CUSTOMER,
    type: MESSAGE_TYPE.PUBLIC,
    body: 'Please provide the invoice for the annual subscription paid on October 1st including our corporate VAT registration number.',
    source: MESSAGE_SOURCE.WEB,
  });

  await TicketActivity.create({
    ticketId: ticket2._id,
    actorId: customer2._id,
    actorName: customer2.name,
    action: 'ticket_created',
    newValue: ticket2.ticketNumber,
  });

  // Ticket 3: Resolved
  const ticket3 = await Ticket.create({
    ticketNumber: 'TKT-2026-000003',
    subject: 'Two-Factor Authentication Setup Assistance',
    description: 'I lost access to my authenticator app and need help generating backup recovery codes.',
    requesterId: customer1._id,
    requesterEmail: customer1.email,
    assignedTo: agent2._id,
    category: 'Account & Security',
    priority: TICKET_PRIORITY.HIGH,
    status: TICKET_STATUS.RESOLVED,
    resolvedAt: new Date(Date.now() - 1 * 3600 * 1000),
    lastMessageAt: new Date(Date.now() - 1 * 3600 * 1000),
  });

  await TicketMessage.insertMany([
    {
      ticketId: ticket3._id,
      senderId: customer1._id,
      senderEmail: customer1.email,
      senderName: customer1.name,
      senderRole: ROLES.CUSTOMER,
      type: MESSAGE_TYPE.PUBLIC,
      body: 'I lost access to my authenticator app and need help generating backup recovery codes.',
      source: MESSAGE_SOURCE.WEB,
      createdAt: new Date(Date.now() - 24 * 3600 * 1000),
    },
    {
      ticketId: ticket3._id,
      senderId: agent2._id,
      senderEmail: agent2.email,
      senderName: agent2.name,
      senderRole: ROLES.AGENT,
      type: MESSAGE_TYPE.PUBLIC,
      body: 'We have initiated the secure verification procedure and reset your MFA device. You may now log in using SMS OTP.',
      source: MESSAGE_SOURCE.WEB,
      createdAt: new Date(Date.now() - 1 * 3600 * 1000),
    },
  ]);

  await TicketActivity.insertMany([
    {
      ticketId: ticket3._id,
      actorId: customer1._id,
      actorName: customer1.name,
      action: 'ticket_created',
      newValue: ticket3.ticketNumber,
    },
    {
      ticketId: ticket3._id,
      actorId: agent2._id,
      actorName: agent2.name,
      action: 'ticket_resolved',
      oldValue: 'in_progress',
      newValue: 'resolved',
    },
  ]);

  // Set sequence counter
  await Counter.create({
    name: `ticket_${new Date().getFullYear()}`,
    seq: 3,
  });

  logger.info('Database seeding completed successfully!');
  logger.info('----------------------------------------------');
  logger.info('Demo Credentials:');
  logger.info('Admin:    admin@bitmax.local       / Password123!');
  logger.info('Agent 1:  sarah.agent@bitmax.local / Password123!');
  logger.info('Agent 2:  david.agent@bitmax.local / Password123!');
  logger.info('Customer: john.doe@example.com     / Password123!');
  logger.info('Customer: emma.watson@example.com  / Password123!');
  logger.info('----------------------------------------------');

  await mongoose.disconnect();
};

seedDatabase().catch((err) => {
  logger.error('Seeding failed:', err);
  process.exit(1);
});
