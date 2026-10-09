import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';

export function ConfirmDelete({ label = 'this record', onConfirm, onCancel, loading }) {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); e.target === e.currentTarget && onCancel(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-red-500 to-red-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Trash2 size={15} className="text-white" />
            </div>
            <h3 className="text-sm font-black text-white">Confirm Delete</h3>
          </div>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={17} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Delete {label}?</p>
              <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone. The record will be permanently removed.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 transition-all shadow-md shadow-red-200 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
                : <><Trash2 size={14} /> Delete</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function RecordActions({ onDetails, onEdit, onDelete, deleteLoading = false, deleteLabel }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    onDelete?.();
    setShowConfirm(false);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-nowrap">
        {onDetails && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDetails(); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors whitespace-nowrap"
            title="View Details"
          >
            <Eye size={13} />
            <span>Details</span>
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 hover:border-sky-300 transition-colors whitespace-nowrap"
            title="Edit"
          >
            <Pencil size={13} />
            <span>Edit</span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={deleteLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-colors whitespace-nowrap disabled:opacity-50"
            title="Delete"
          >
            {deleteLoading
              ? <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              : <Trash2 size={13} />
            }
            <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
          </button>
        )}
      </div>

      {showConfirm && (
        <ConfirmDelete
          label={deleteLabel}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}
