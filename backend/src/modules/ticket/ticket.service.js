import mongoose from 'mongoose';
import {
  Ticket,
  TicketMessage,
  TicketActivity,
  User,
  getNextTicketNumber,
} from '../../database/index.js';
import {
  ROLES,
  TICKET_STATUS,
  STATUS_TRANSITIONS,
  MESSAGE_TYPE,
  MESSAGE_SOURCE,
} from '../../constants/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { emailService } from '../../services/email.service.js';
import { ioService } from '../../services/socket.service.js';
import { logger } from '../../utils/logger.js';
import sanitizeHtml from 'sanitize-html';


const sanitizeText = (txt = '') =>
  sanitizeHtml(txt, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'span', 'code', 'pre', 'blockquote'],
    allowedAttributes: { span: ['style'] },
  });

const getTicketNotificationRecipients = async (ticket, actorEmail) => {
  const assignedUser = ticket.assignedTo
    ? await User.findById(ticket.assignedTo).select('email')
    : null;
  const actor = actorEmail?.toLowerCase();
  const emails = [ticket.requesterEmail, assignedUser?.email]
    .filter(Boolean)
    .map((email) => email.toLowerCase())
    .filter((email, index, all) => all.indexOf(email) === index && email !== actor);

  return emails;
};

const notifyTicketStatusChanged = async (ticket, actor) => {
  const recipients = await getTicketNotificationRecipients(ticket, actor.email);
  recipients.forEach((email) => emailService.queueStatusChanged(ticket, actor.name, email));
};

const notifyTicketEvent = async (ticket, actor, eventTitle, eventDetails) => {
  const recipients = await getTicketNotificationRecipients(ticket, actor.email);
  recipients.forEach((email) => emailService.queueTicketEvent(ticket, email, eventTitle, eventDetails));
};


export const ticketService = {
  // ─── Internal helper: pick the agent with the fewest active tickets ──────
  async _autoAssignAgent(ticket) {
    try {
      // Fetch all verified agents and admins
      const agents = await User.find({
        role: { $in: [ROLES.AGENT, ROLES.ADMIN] },
        isVerified: true,
      }).select('_id name email role');

      if (!agents.length) {
        logger.info(`[AutoAssign] No agents available — ticket ${ticket.ticketNumber} stays unassigned`);
        return null;
      }

      // Count active (non-terminal) tickets per agent
      const activeStatuses = [
        TICKET_STATUS.OPEN,
        TICKET_STATUS.IN_PROGRESS,
        TICKET_STATUS.REOPENED,
        TICKET_STATUS.PENDING,
      ];

      const workloads = await Promise.all(
        agents.map(async (agent) => ({
          agent,
          count: await Ticket.countDocuments({
            assignedTo: agent._id,
            status: { $in: activeStatuses },
          }),
        }))
      );

      // Sort by workload ascending; on tie keep DB insertion order (stable)
      workloads.sort((a, b) => a.count - b.count);
      const { agent } = workloads[0];

      // Assign the ticket
      ticket.assignedTo = agent._id;
      ticket.assignedAt = new Date();
      await ticket.save();

      // Log the auto-assignment activity
      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: agent._id,
        actorName: 'System',
        action: 'ticket_auto_assigned',
        oldValue: 'Unassigned',
        newValue: agent.name,
        metadata: {
          strategy: 'least_workload',
          agentWorkload: workloads[0].count,
        },
      });

      // Notify the assigned agent by email
      emailService.queueTicketAssigned(ticket, agent);
      emailService.queueTicketEvent(
        ticket,
        ticket.requesterEmail,
        'Ticket assigned',
        `Your ticket has been assigned to ${agent.name}.`
      );

      logger.info(
        `[AutoAssign] ✅ Ticket ${ticket.ticketNumber} auto-assigned to ${agent.name} (${agent.email}) — workload: ${workloads[0].count} active tickets`
      );

      return agent;
    } catch (err) {
      // Auto-assignment failure must never block ticket creation
      logger.error(`[AutoAssign] ❌ Failed to auto-assign ticket ${ticket.ticketNumber}:`, err.message);
      return null;
    }
  },

  async createTicket({ user, subject, description, category, priority, attachments = [] }) {
    const ticketNumber = await getNextTicketNumber();

    // SLA default calculation: Urgent=4h, High=12h, Medium=24h, Low=48h
    const slaHours = {
      urgent: 4,
      high: 12,
      medium: 24,
      low: 48,
    }[priority] || 24;
    const slaDueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await Ticket.create({
      ticketNumber,
      subject: subject.trim(),
      description: sanitizeText(description.trim()),
      requesterId: user._id,
      requesterEmail: user.email.toLowerCase().trim(),
      category: category.trim(),
      priority,
      status: TICKET_STATUS.OPEN,
      attachments,
      slaDueDate,
      lastMessageAt: new Date(),
    });

    // Record initial message as description thread start
    const initialMessage = await TicketMessage.create({
      ticketId: ticket._id,
      senderId: user._id,
      senderEmail: user.email,
      senderName: user.name,
      senderRole: user.role,
      type: MESSAGE_TYPE.PUBLIC,
      body: sanitizeText(description.trim()),
      attachments,
      source: MESSAGE_SOURCE.WEB,
    });

    // Audit activity
    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: user._id,
      actorName: user.name,
      action: 'ticket_created',
      newValue: ticket.ticketNumber,
      metadata: { priority, category, initialStatus: TICKET_STATUS.OPEN },
    });

    // Queue confirmation email to requester
    emailService.queueTicketCreated(ticket, user);

    // Auto-assign to the agent with the least active workload
    await this._autoAssignAgent(ticket);

    // Broadcast to agents / admin
    ioService.emitTicketStatusUpdated(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      action: 'created',
    });
    ioService.emitTicketMessage(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      message: initialMessage,
      status: ticket.status,
    });

    // Return fully-populated ticket so caller gets assignedTo populated
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('requesterId', 'name email phone role')
      .populate('assignedTo', 'name email role');

    return populatedTicket;
  },


  async listTickets({ user, query }) {
    const {
      search,
      status,
      priority,
      category,
      assignedTo,
      requesterId,
      view,
      startDate,
      endDate,
      sortBy = 'newest',
      page = 1,
      limit = 10,
    } = query;

    const filter = {};

    // RBAC: Customer can ONLY see their own tickets
    if (user.role === ROLES.CUSTOMER) {
      filter.requesterId = user._id;
    } else {
      // Agent & Admin filtering
      if (view === 'my') {
        filter.assignedTo = user._id;
      } else if (view === 'unassigned') {
        filter.assignedTo = null;
      }

      if (assignedTo) {
        if (assignedTo === 'unassigned') {
          filter.assignedTo = null;
        } else if (mongoose.Types.ObjectId.isValid(assignedTo)) {
          filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        }
      }

      if (requesterId && mongoose.Types.ObjectId.isValid(requesterId)) {
        filter.requesterId = new mongoose.Types.ObjectId(requesterId);
      }
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { ticketNumber: searchRegex },
        { subject: searchRegex },
        { description: searchRegex },
        { requesterEmail: searchRegex },
      ];
    }

    const sortOptions = {};
    if (sortBy === 'oldest') sortOptions.createdAt = 1;
    else if (sortBy === 'last_updated') sortOptions.updatedAt = -1;
    else if (sortBy === 'priority') {
      // Sorting priority by order: urgent -> high -> medium -> low
      // Mapped via simple sort or aggregation, default by createdAt -1
      sortOptions.createdAt = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('requesterId', 'name email phone role')
        .populate('assignedTo', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Ticket.countDocuments(filter),
    ]);

    return {
      tickets,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  async getTicketByIdOrNumber({ identifier, user }) {
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
    const query = isObjectId ? { _id: identifier } : { ticketNumber: identifier };

    const ticket = await Ticket.findOne(query)
      .populate('requesterId', 'name email phone role')
      .populate('assignedTo', 'name email role');

    if (!ticket) throw ApiError.notFound('Ticket not found');

    // Customer can only view their own ticket
    if (user.role === ROLES.CUSTOMER && ticket.requesterId._id.toString() !== user.id) {
      throw ApiError.forbidden('You do not have permission to view this ticket');
    }

    return ticket;
  },

  async updateTicketMetadata({ ticketId, user, updates }) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    if (user.role === ROLES.CUSTOMER) {
      throw ApiError.forbidden('Customers cannot modify ticket metadata');
    }

    const { category, priority, status } = updates;
    const ticketEvents = [];

    if (category && category !== ticket.category) {
      const oldCat = ticket.category;
      ticket.category = category.trim();
      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: user._id,
        actorName: user.name,
        action: 'category_changed',
        oldValue: oldCat,
        newValue: ticket.category,
      });
      ticketEvents.push({
        title: 'Ticket category updated',
        details: `The category changed from ${oldCat} to ${ticket.category}.`,
      });
    }

    if (priority && priority !== ticket.priority) {
      const oldPri = ticket.priority;
      ticket.priority = priority;
      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: user._id,
        actorName: user.name,
        action: 'priority_changed',
        oldValue: oldPri,
        newValue: ticket.priority,
      });
      ticketEvents.push({
        title: 'Ticket priority updated',
        details: `The priority changed from ${oldPri} to ${ticket.priority}.`,
      });
    }

    let statusWasChanged = false;
    if (status && status !== ticket.status) {
      this.validateStatusTransition(ticket.status, status);
      const oldStat = ticket.status;
      ticket.status = status;
      if (status === TICKET_STATUS.RESOLVED) ticket.resolvedAt = new Date();
      if (status === TICKET_STATUS.CLOSED) ticket.closedAt = new Date();
      if (status === TICKET_STATUS.REOPENED) ticket.reopenedAt = new Date();

      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: user._id,
        actorName: user.name,
        action: 'status_changed',
        oldValue: oldStat,
        newValue: ticket.status,
      });

      statusWasChanged = true;
      ioService.emitTicketStatusUpdated(ticket._id.toString(), {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
      });
    }

    await ticket.save();
    if (statusWasChanged) await notifyTicketStatusChanged(ticket, user);
    for (const event of ticketEvents) {
      await notifyTicketEvent(ticket, user, event.title, event.details);
    }
    return ticket;
  },

  async assignTicket({ ticketId, user, agentId }) {
    if (user.role === ROLES.CUSTOMER) {
      throw ApiError.forbidden('Only agents and admins can assign tickets');
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    const agent = await User.findById(agentId);
    if (!agent || ![ROLES.AGENT, ROLES.ADMIN].includes(agent.role)) {
      throw ApiError.badRequest('Assigned user must be an active Agent or Admin');
    }

    const oldAgent = ticket.assignedTo ? await User.findById(ticket.assignedTo) : null;
    ticket.assignedTo = agent._id;
    ticket.assignedAt = new Date();
    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: user._id,
      actorName: user.name,
      action: 'ticket_assigned',
      oldValue: oldAgent ? oldAgent.name : 'Unassigned',
      newValue: agent.name,
    });

    // Notify the newly assigned agent unless they performed the assignment.
    if (agent.email.toLowerCase() !== user.email.toLowerCase()) {
      emailService.queueTicketAssigned(ticket, agent);
    }
    if (ticket.requesterEmail.toLowerCase() !== user.email.toLowerCase()) {
      emailService.queueTicketEvent(
        ticket,
        ticket.requesterEmail,
        'Ticket assigned',
        `Your ticket has been assigned to ${agent.name}.`
      );
    }

    ioService.emitTicketAssigned(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      assignedTo: { id: agent._id, name: agent.name, email: agent.email },
    });

    return ticket;
  },

  async addMessage({ ticketId, user, body, type = MESSAGE_TYPE.PUBLIC, attachments = [] }) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    // Customer security check
    if (user.role === ROLES.CUSTOMER) {
      if (ticket.requesterId.toString() !== user.id) {
        throw ApiError.forbidden('You can only reply to your own tickets');
      }
      if (type === MESSAGE_TYPE.INTERNAL) {
        throw ApiError.forbidden('Customers cannot add internal notes');
      }
    }

    const cleanBody = sanitizeText(body.trim());

    // If ticket was resolved/closed and customer replies -> reopen!
    let wasReopened = false;
    if (
      user.role === ROLES.CUSTOMER &&
      [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(ticket.status)
    ) {
      const oldStatus = ticket.status;
      ticket.status = TICKET_STATUS.REOPENED;
      ticket.reopenedAt = new Date();
      wasReopened = true;

      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: user._id,
        actorName: user.name,
        action: 'ticket_reopened',
        oldValue: oldStatus,
        newValue: TICKET_STATUS.REOPENED,
        metadata: { reason: 'Customer replied to resolved ticket' },
      });
    }

    ticket.lastMessageAt = new Date();
    await ticket.save();

    const message = await TicketMessage.create({
      ticketId: ticket._id,
      senderId: user._id,
      senderEmail: user.email,
      senderName: user.name,
      senderRole: user.role,
      type,
      body: cleanBody,
      attachments,
      source: MESSAGE_SOURCE.WEB,
    });

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: user._id,
      actorName: user.name,
      action: type === MESSAGE_TYPE.INTERNAL ? 'internal_note_added' : 'reply_added',
      newValue: cleanBody.substring(0, 80),
      metadata: { messageId: message._id, type },
    });

    // Notify the other participant when a public message is added.
    if (type === MESSAGE_TYPE.PUBLIC) {
      if (user.role === ROLES.CUSTOMER) {
        if (ticket.assignedTo) {
          const agent = await User.findById(ticket.assignedTo);
          if (agent && agent.email.toLowerCase() !== user.email.toLowerCase()) {
            emailService.queueTicketReply(ticket, message, agent.email);
          }
        }
      } else {
        if (ticket.requesterEmail.toLowerCase() !== user.email.toLowerCase()) {
          emailService.queueTicketReply(ticket, message, ticket.requesterEmail);
        }
      }
    }

    ioService.emitTicketMessage(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      message,
      status: ticket.status,
      reopened: wasReopened,
    });

    return message;
  },

  async resolveTicket({ ticketId, user, reason }) {
    if (user.role === ROLES.CUSTOMER) {
      throw ApiError.forbidden('Only support agents or admins can resolve tickets');
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    this.validateStatusTransition(ticket.status, TICKET_STATUS.RESOLVED);

    const oldStatus = ticket.status;
    ticket.status = TICKET_STATUS.RESOLVED;
    ticket.resolvedAt = new Date();
    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: user._id,
      actorName: user.name,
      action: 'ticket_resolved',
      oldValue: oldStatus,
      newValue: TICKET_STATUS.RESOLVED,
      metadata: { reason: reason || 'Marked resolved by agent' },
    });

    await notifyTicketStatusChanged(ticket, user);

    ioService.emitTicketStatusUpdated(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
    });

    return ticket;
  },

  async reopenTicket({ ticketId, user, reason }) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    if (user.role === ROLES.CUSTOMER && ticket.requesterId.toString() !== user.id) {
      throw ApiError.forbidden('You can only reopen your own tickets');
    }

    this.validateStatusTransition(ticket.status, TICKET_STATUS.REOPENED);

    const oldStatus = ticket.status;
    ticket.status = TICKET_STATUS.REOPENED;
    ticket.reopenedAt = new Date();
    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: user._id,
      actorName: user.name,
      action: 'ticket_reopened',
      oldValue: oldStatus,
      newValue: TICKET_STATUS.REOPENED,
      metadata: { reason: reason || 'Reopened by user' },
    });

    await notifyTicketStatusChanged(ticket, user);

    ioService.emitTicketStatusUpdated(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
    });

    return ticket;
  },

  async closeTicket({ ticketId, user, reason }) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    if (user.role === ROLES.CUSTOMER && ticket.requesterId.toString() !== user.id) {
      throw ApiError.forbidden('You can only close your own tickets');
    }

    this.validateStatusTransition(ticket.status, TICKET_STATUS.CLOSED);

    const oldStatus = ticket.status;
    ticket.status = TICKET_STATUS.CLOSED;
    ticket.closedAt = new Date();
    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: user._id,
      actorName: user.name,
      action: 'ticket_closed',
      oldValue: oldStatus,
      newValue: TICKET_STATUS.CLOSED,
      metadata: { reason: reason || 'Ticket closed' },
    });

    await notifyTicketStatusChanged(ticket, user);

    ioService.emitTicketStatusUpdated(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
    });

    return ticket;
  },

  async getMessages({ ticketId, user, page = 1, limit = 100 }) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    if (user.role === ROLES.CUSTOMER && ticket.requesterId.toString() !== user.id) {
      throw ApiError.forbidden('You can only view messages for your own tickets');
    }

    const filter = { ticketId: ticket._id };
    // Customers can NEVER see internal notes
    if (user.role === ROLES.CUSTOMER) {
      filter.type = { $ne: MESSAGE_TYPE.INTERNAL };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await TicketMessage.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit));

    return messages;
  },

  async getActivity({ ticketId, user }) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw ApiError.notFound('Ticket not found');

    if (user.role === ROLES.CUSTOMER && ticket.requesterId.toString() !== user.id) {
      throw ApiError.forbidden('You can only view activity for your own tickets');
    }

    const filter = { ticketId: ticket._id };
    if (user.role === ROLES.CUSTOMER) {
      filter.action = { $ne: 'internal_note_added' };
    }

    const activities = await TicketActivity.find(filter).sort({ createdAt: -1 });
    return activities;
  },

  validateStatusTransition(currentStatus, targetStatus) {
    if (currentStatus === targetStatus) return true;
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw ApiError.badRequest(
        `Invalid status transition from "${currentStatus}" to "${targetStatus}". Allowed: ${allowed.join(', ') || 'None'}`
      );
    }
    return true;
  },
};
