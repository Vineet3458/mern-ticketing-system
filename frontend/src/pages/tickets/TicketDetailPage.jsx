import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Mail,
  Globe,
  Send,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Clock,
  Paperclip,
  ShieldAlert,
  Copy,
  Check,
  User,
  Tag,
} from 'lucide-react';
import {
  fetchTicketById,
  addMessage,
  assignTicket,
  resolveTicket,
  reopenTicket,
  closeTicket,
  socketMessageReceived,
  socketStatusUpdated,
  socketTicketAssigned,
  clearCurrentTicket,
} from '../../features/tickets/ticketSlice.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { PriorityBadge } from '../../components/common/PriorityBadge.jsx';
import { RoleBadge } from '../../components/common/RoleBadge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { getSocket, joinTicketRoom, leaveTicketRoom } from '../../services/socket.js';
import api from '../../services/api.js';

export const TicketDetailPage = () => {
  const { ticketId } = useParams();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { currentTicket, messages, activity, isDetailLoading, error } = useSelector(
    (state) => state.tickets
  );

  const [replyText, setReplyText] = useState('');
  const [messageType, setMessageType] = useState('public'); // 'public' | 'internal'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modals state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');

  // Agents list for assignment dropdown
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');

  const messagesEndRef = useRef(null);

  const isCustomer = user?.role === 'customer';
  const isAgentOrAdmin = user?.role === 'agent' || user?.role === 'admin';

  const displayedMessages = isCustomer
    ? (messages || []).filter((m) => m.type !== 'internal')
    : (messages || []);

  // Fetch ticket details
  useEffect(() => {
    if (ticketId) {
      dispatch(fetchTicketById(ticketId));
      joinTicketRoom(ticketId);
    }

    return () => {
      if (ticketId) leaveTicketRoom(ticketId);
      dispatch(clearCurrentTicket());
    };
  }, [dispatch, ticketId]);

  // Load agents list for assignment dropdown
  useEffect(() => {
    if (isAgentOrAdmin) {
      api.get('/users?role=agent').then((res) => {
        setAgents(res.data.data || []);
      }).catch(() => {});
    }
  }, [isAgentOrAdmin]);

  // Socket.IO real-time event listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = (data) => {
      dispatch(socketMessageReceived(data));
      scrollToBottom();
    };

    const handleStatus = (data) => {
      dispatch(socketStatusUpdated(data));
    };

    const handleAssigned = (data) => {
      dispatch(socketTicketAssigned(data));
    };

    socket.on('ticket_message', handleMessage);
    socket.on('ticket_status', handleStatus);
    socket.on('ticket_assigned', handleAssigned);

    return () => {
      socket.off('ticket_message', handleMessage);
      socket.off('ticket_status', handleStatus);
      socket.off('ticket_assigned', handleAssigned);
    };
  }, [dispatch]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyTicketNumber = () => {
    if (!currentTicket?.ticketNumber) return;
    navigator.clipboard.writeText(currentTicket.ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      await dispatch(
        addMessage({
          ticketId: currentTicket._id,
          body: replyText.trim(),
          type: messageType,
        })
      );
      setReplyText('');
      scrollToBottom();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async (agentId) => {
    if (!agentId) return;
    await dispatch(assignTicket({ ticketId: currentTicket._id, agentId }));
    dispatch(fetchTicketById(ticketId));
  };

  const handleResolve = async () => {
    await dispatch(resolveTicket({ ticketId: currentTicket._id, reason: actionReason }));
    setIsResolveModalOpen(false);
    setActionReason('');
    dispatch(fetchTicketById(ticketId));
  };

  const handleReopen = async () => {
    await dispatch(reopenTicket({ ticketId: currentTicket._id, reason: actionReason }));
    setIsReopenModalOpen(false);
    setActionReason('');
    dispatch(fetchTicketById(ticketId));
  };

  const handleClose = async () => {
    await dispatch(closeTicket({ ticketId: currentTicket._id, reason: actionReason }));
    setIsCloseModalOpen(false);
    setActionReason('');
    dispatch(fetchTicketById(ticketId));
  };

  if (isDetailLoading) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-3">
        <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold">Loading ticket workspace...</p>
      </div>
    );
  }

  if (error || !currentTicket) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Unable to load ticket</h2>
        <p className="text-xs text-slate-500">{error || 'Ticket not found or access denied.'}</p>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Ticket Queue</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 card-shadow">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/tickets"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <span className="font-mono text-sm font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5">
              <span>{currentTicket.ticketNumber}</span>
              <button
                onClick={handleCopyTicketNumber}
                title="Copy Ticket ID"
                className="text-blue-500 hover:text-blue-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </span>

            <StatusBadge status={currentTicket.status} size="lg" />
            <PriorityBadge priority={currentTicket.priority} size="lg" />
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {currentTicket.category}
            </span>
          </div>

          <h1 className="text-xl font-black text-slate-900 tracking-tight">{currentTicket.subject}</h1>
        </div>

        {/* Quick Lifecycle Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isAgentOrAdmin && currentTicket.status !== 'resolved' && currentTicket.status !== 'closed' && (
            <button
              onClick={() => setIsResolveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Resolve Ticket</span>
            </button>
          )}

          {(currentTicket.status === 'resolved' || currentTicket.status === 'closed') && (
            <button
              onClick={() => setIsReopenModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reopen Ticket</span>
            </button>
          )}

          {currentTicket.status !== 'closed' && (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Conversation Left + Metadata & Activity Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Chronological Conversation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Ticket Conversation Thread</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 live-indicator" />
                <span>Live Socket.IO Sync</span>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="space-y-4">
              {displayedMessages.map((msg) => {
                const isInternal = msg.type === 'internal';
                const isEmailSource = msg.source === 'email';

                return (
                  <div
                    key={msg._id}
                    className={`rounded-2xl p-4 transition-all ${
                      isInternal
                        ? 'bg-amber-50/70 border-2 border-dashed border-amber-300'
                        : msg.senderRole === 'customer'
                        ? 'bg-slate-50 border border-slate-200/80'
                        : 'bg-blue-50/60 border border-blue-200/70'
                    }`}
                  >
                    {/* Internal Note Banner */}
                    {isInternal && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 pb-2 mb-2 border-b border-amber-200">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>INTERNAL NOTE (Visible only to support agents & admins)</span>
                      </div>
                    )}

                    {/* Sender Info & Source */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            msg.senderRole === 'customer'
                              ? 'bg-slate-700 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{msg.senderName || msg.senderEmail}</span>
                            <RoleBadge role={msg.senderRole} />
                          </div>
                          <span className="text-[11px] text-slate-400">{msg.senderEmail}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {isEmailSource ? (
                          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                            <Mail className="w-3 h-3 text-purple-600" />
                            <span>Received via Email</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            <Globe className="w-3 h-3" />
                            <span>Web Portal</span>
                          </span>
                        )}
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Message Body */}
                    <div
                      className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-9"
                      dangerouslySetInnerHTML={{ __html: msg.body }}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-100 space-y-3">
              {isAgentOrAdmin && (
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setMessageType('public')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      messageType === 'public'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Public Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageType('internal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      messageType === 'internal'
                        ? 'bg-amber-100 text-amber-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Internal Note</span>
                  </button>
                </div>
              )}

              <div className="relative">
                <textarea
                  rows={4}
                  required
                  placeholder={
                    messageType === 'internal'
                      ? 'Add confidential note for other support agents...'
                      : 'Type your message to the customer (they will also receive this via email)...'
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className={`w-full text-xs p-3.5 rounded-2xl border outline-none focus:ring-2 transition-all ${
                    messageType === 'internal'
                      ? 'border-amber-300 focus:ring-amber-500 bg-amber-50/40'
                      : 'border-slate-200 focus:ring-blue-500 bg-slate-50 focus:bg-white'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {messageType === 'public'
                    ? 'Customer is notified immediately via email and real-time portal.'
                    : 'Confidential: Hidden from customer view.'}
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting || !replyText.trim()}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all disabled:opacity-50 ${
                    messageType === 'internal'
                      ? 'bg-amber-700 hover:bg-amber-800'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Posting...' : messageType === 'internal' ? 'Add Note' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Metadata & Activity Audit Sidebar */}
        <div className="space-y-6">
          {/* Ticket Information Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Ticket Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Requester</span>
                <span className="font-bold text-slate-800">{currentTicket.requesterId?.name || currentTicket.requesterEmail}</span>
                <span className="text-slate-500 block text-[11px]">{currentTicket.requesterEmail}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Category</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>{currentTicket.category || 'General'}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Assigned Agent</span>
                {isAgentOrAdmin ? (
                  <div className="mt-1">
                    <select
                      value={currentTicket.assignedTo?._id || ''}
                      onChange={(e) => handleAssign(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold text-slate-800"
                    >
                      <option value="">-- Unassigned --</option>
                      {agents.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name} ({a.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="font-bold text-slate-800">
                    {currentTicket.assignedTo ? currentTicket.assignedTo.name : 'Unassigned'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">SLA Due Date</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {currentTicket.slaDueDate
                      ? new Date(currentTicket.slaDueDate).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Standard SLA'}
                  </span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Created At</span>
                <span className="text-slate-600 font-medium">
                  {new Date(currentTicket.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Activity / Audit History Panel */}
          <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Activity Timeline</span>
              <span className="text-[11px] text-slate-400 font-normal">Audit Log</span>
            </h3>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-100">
              {activity.map((act) => (
                <div key={act._id} className="relative flex items-start gap-3 pl-1 text-xs">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold z-10 flex-shrink-0 mt-0.5">
                    •
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-800 leading-tight">
                      <strong className="font-bold">{act.actorName}</strong>{' '}
                      <span className="text-slate-500 font-medium">{act.action.replace('_', ' ')}</span>
                    </p>
                    {act.newValue && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 bg-slate-50 p-1 rounded border border-slate-100">
                        {act.oldValue ? `${act.oldValue} → ` : ''}
                        {act.newValue}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {new Date(act.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Ticket Modal */}
      <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Resolve Ticket">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Confirm marking this ticket as <strong>Resolved</strong>. The customer will be notified via email and can reopen if they need further assistance.
          </p>
          <input
            type="text"
            placeholder="Resolution summary or notes..."
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsResolveModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
            >
              Confirm Resolve
            </button>
          </div>
        </div>
      </Modal>

      {/* Reopen Ticket Modal */}
      <Modal isOpen={isReopenModalOpen} onClose={() => setIsReopenModalOpen(false)} title="Reopen Ticket">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a reason for reopening this ticket:
          </p>
          <input
            type="text"
            placeholder="Reason for reopening..."
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsReopenModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleReopen}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
            >
              Confirm Reopen
            </button>
          </div>
        </div>
      </Modal>

      {/* Close Ticket Modal */}
      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Close Ticket">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to close this ticket?
          </p>
          <input
            type="text"
            placeholder="Closing notes..."
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm"
            >
              Confirm Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
