export const ROLES = Object.freeze({ CUSTOMER: 'customer', AGENT: 'agent', ADMIN: 'admin' });

export const TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REOPENED: 'reopened',
});

export const TICKET_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

export const MESSAGE_TYPE = Object.freeze({ PUBLIC: 'public', INTERNAL: 'internal', SYSTEM: 'system' });
export const MESSAGE_SOURCE = Object.freeze({ WEB: 'web', EMAIL: 'email', SYSTEM: 'system' });
export const EMAIL_DIRECTION = Object.freeze({ INBOUND: 'inbound', OUTBOUND: 'outbound' });
export const EMAIL_STATUS = Object.freeze({ QUEUED: 'queued', SENT: 'sent', PROCESSED: 'processed', FAILED: 'failed', DUPLICATE: 'duplicate', IGNORED: 'ignored' });

// Valid ticket state transitions (enforced in the ticket service - next step)
export const STATUS_TRANSITIONS = Object.freeze({
  open: ['in_progress', 'pending', 'resolved', 'closed'],
  in_progress: ['pending', 'resolved', 'closed'],
  pending: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in_progress', 'pending', 'resolved', 'closed'],
});
