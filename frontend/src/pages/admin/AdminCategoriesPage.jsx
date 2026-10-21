import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { PlusCircle, Tag, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { fetchCategories, createCategory } from '../../features/categories/categorySlice.js';
import { Modal } from '../../components/common/Modal.jsx';

export const AdminCategoriesPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, isLoading } = useSelector((state) => state.categories);
  const isAdmin = user?.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    dispatch(fetchCategories(isAdmin));
  }, [dispatch, isAdmin]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg('');
    setError('');

    try {
      const resAction = await dispatch(createCategory({ name: name.trim(), description: description.trim() }));
      if (createCategory.fulfilled.match(resAction)) {
        setMsg('Category created successfully!');
        setName('');
        setDescription('');
        setIsModalOpen(false);
        dispatch(fetchCategories(isAdmin));
      } else {
        setError(resAction.payload || 'Failed to create category');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedCategories = isAdmin
    ? categories
    : categories.filter((c) => c.isActive !== false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isAdmin ? 'Ticket Categories' : 'Support Categories'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Configure department classifications, routing tags, and support topics.'
              : 'Browse available support classifications and raise a targeted request.'}
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Category</span>
          </button>
        ) : (
          <Link
            to="/tickets/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Ticket</span>
          </Link>
        )}
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Categories Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedCategories.map((c) => (
          <div
            key={c._id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 card-shadow space-y-3 flex flex-col justify-between hover:border-blue-200 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Tag className="w-4 h-4" />
                </span>
                {isAdmin ? (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      c.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Disabled'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                    Available
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {c.description || 'General support inquiries and requests.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Standard'}
              </span>
              <Link
                to={`/tickets/create?category=${encodeURIComponent(c.name)}`}
                className="font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
              >
                <span>Raise Ticket</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Category Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Category">
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Cloud Infrastructure"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe what inquiries belong to this category..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
