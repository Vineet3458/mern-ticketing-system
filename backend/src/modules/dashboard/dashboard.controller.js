import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendResponse } from '../../utils/ApiResponse.js';
import { Ticket, TicketActivity } from '../../database/index.js';
import { ROLES, TICKET_STATUS, TICKET_PRIORITY } from '../../constants/index.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const user = req.user;
  const isCustomer = user.role === ROLES.CUSTOMER;

  // Scope filter: Customer only sees their tickets; Agent/Admin see platform tickets
  const baseFilter = isCustomer && user._id ? { requesterId: new mongoose.Types.ObjectId(user._id) } : {};

  // For activity stream: Customer only sees activities for their own tickets, excluding internal notes
  let activityFilter = {};
  if (isCustomer && user._id) {
    const customerTickets = await Ticket.find({ requesterId: user._id }).select('_id').lean();
    const customerTicketIds = customerTickets.map((t) => t._id);
    activityFilter = {
      ticketId: { $in: customerTicketIds },
      action: { $ne: 'internal_note_added' },
    };
  }

  const [
    total,
    open,
    inProgress,
    pending,
    resolved,
    closed,
    reopened,
    unassigned,
    assignedToMe,
    priorityStats,
    categoryStats,
    recentActivity,
  ] = await Promise.all([
    Ticket.countDocuments(baseFilter),
    Ticket.countDocuments({ ...baseFilter, status: TICKET_STATUS.OPEN }),
    Ticket.countDocuments({ ...baseFilter, status: TICKET_STATUS.IN_PROGRESS }),
    Ticket.countDocuments({ ...baseFilter, status: TICKET_STATUS.PENDING }),
    Ticket.countDocuments({ ...baseFilter, status: TICKET_STATUS.RESOLVED }),
    Ticket.countDocuments({ ...baseFilter, status: TICKET_STATUS.CLOSED }),
    Ticket.countDocuments({ ...baseFilter, status: TICKET_STATUS.REOPENED }),
    isCustomer ? 0 : Ticket.countDocuments({ assignedTo: null }),
    isCustomer ? 0 : Ticket.countDocuments({ assignedTo: user._id }),

    // Priority breakdown
    Ticket.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),

    // Category breakdown
    Ticket.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Recent activity stream
    TicketActivity.find(activityFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('ticketId', 'ticketNumber subject status priority requesterId'),
  ]);

  // Format priority breakdown
  const priorityMap = {
    [TICKET_PRIORITY.LOW]: 0,
    [TICKET_PRIORITY.MEDIUM]: 0,
    [TICKET_PRIORITY.HIGH]: 0,
    [TICKET_PRIORITY.URGENT]: 0,
  };
  priorityStats.forEach((p) => {
    if (p._id && priorityMap[p._id] !== undefined) priorityMap[p._id] = p.count;
  });

  // Filter recent activities to those user can view if customer
  const filteredActivity = isCustomer
    ? recentActivity.filter(
        (act) => act.ticketId && String(act.ticketId.requesterId) === String(user._id || user.id)
      )
    : recentActivity;

  return sendResponse(res, 200, 'Dashboard statistics retrieved', {
    metrics: {
      total,
      open,
      inProgress,
      pending,
      resolved,
      closed,
      reopened,
      unassigned,
      assignedToMe,
    },
    byPriority: priorityMap,
    byCategory: categoryStats.map((c) => ({ category: c._id || 'Unspecified', count: c.count })),
    recentActivity: filteredActivity,
  });
});
