import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import api from '../../services/api.js';

export const EmailSimulatorModal = ({ isOpen, onClose, currentTicket, onEmailProcessed }) => {
  const [fromEmail, setFromEmail] = useState(currentTicket?.requesterEmail || 'john.doe@example.com');
  const [ticketNum, setTicketNum] = useState(currentTicket?.ticketNumber || 'TKT-2026-000001');
  const [subject, setSubject] = useState(
    currentTicket ? `Re: [${currentTicket.ticketNumber}] ${currentTicket.subject}` : 'Re: [TKT-2026-000001] Support Question'
  );
  const [body, setBody] = useState('Hello Support Team, replying directly via email. Please check on this!');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setError(null);

    const messageId = `<simulated-email-${Date.now()}@mail-client.local>`;

    try {
      const res = await api.post('/email/inbound', {
        from: fromEmail.trim(),
        senderName: fromEmail.split('@')[0],
        to: `support+${ticketNum.trim()}@bitmax.local`,
        subject: subject.trim(),
        body: body.trim(),
        messageId,
        headers: {
          'x-ticket-number': ticketNum.trim(),
          references: `<ticket-${ticketNum.trim()}@bitmax.local>`,
          'in-reply-to': `<ticket-${ticketNum.trim()}@bitmax.local>`,
        },
      });

      setResult(res.data);
      if (onEmailProcessed) onEmailProcessed(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to simulate inbound email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inbound Email Reply Simulator" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
          <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Interactive Two-Way Email Demonstration:</strong> This tool simulates an email sent from an external client (Gmail, Outlook) to the support helpdesk. The backend will parse the email headers, strip previous quotes, append the message to the ticket conversation, and automatically reopen the ticket if it was resolved or closed!
          </div>
        </div>

        {result && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-sm flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Inbound Email Processed Successfully!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Ticket: <strong>{result.data?.ticketNumber}</strong> |
                Status: {result.data?.reopened ? <span className="font-bold text-rose-600">Reopened automatically</span> : 'Conversation updated'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Email (Customer)</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Number</label>
              <input
                type="text"
                value={ticketNum}
                onChange={(e) => setTicketNum(e.target.value)}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Body Content</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              placeholder="Type customer email reply here..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Simulating...' : 'Dispatch Inbound Email'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
