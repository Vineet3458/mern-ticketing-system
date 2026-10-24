import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PlusCircle, Paperclip, ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { createTicket } from '../../features/tickets/ticketSlice.js';
import { fetchCategories } from '../../features/categories/categorySlice.js';

const DEFAULT_CATEGORIES = [
  { _id: 'cat-1', name: 'Technical Support' },
  { _id: 'cat-2', name: 'Billing & Invoicing' },
  { _id: 'cat-3', name: 'Account & Security' },
  { _id: 'cat-4', name: 'General Inquiries' },
  { _id: 'cat-5', name: 'Feature Request' },
];

export const CreateTicketPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category') || '';

  const { categories } = useSelector((state) => state.categories);
  const categoryList = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(requestedCategory);
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dispatch(fetchCategories(false));
  }, [dispatch]);

  useEffect(() => {
    if (requestedCategory) {
      setCategory(requestedCategory);
    } else if (categoryList.length > 0 && !category) {
      setCategory(categoryList[0].name);
    }
  }, [categoryList, category, requestedCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const resultAction = await dispatch(
        createTicket({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        })
      );

      if (createTicket.fulfilled.match(resultAction)) {
        navigate(`/tickets/${resultAction.payload._id}`);
      } else {
        setError(resultAction.payload || 'Failed to create ticket');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/tickets"
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Create Support Ticket</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit a new technical, billing, or platform request.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-4 sm:p-8">
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject Line *
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g., Unable to connect to database cluster during peak hours"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
            <span className="text-[11px] text-slate-400 mt-1 block text-right">
              {subject.length} / 200 characters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category *</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {categoryList.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority *</label>
              <select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="low">Low (Standard SLA 48h)</option>
                <option value="medium">Medium (Standard SLA 24h)</option>
                <option value="high">High (Urgent SLA 12h)</option>
                <option value="urgent">Urgent (Critical SLA 4h)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Issue Description & Steps to Reproduce *
            </label>
            <textarea
              required
              rows={6}
              placeholder="Please provide complete context, logs, error messages, or steps taken..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-slate-100">
            <Link
              to="/tickets"
              className="px-5 py-2.5 text-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating Ticket...' : 'Submit Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
