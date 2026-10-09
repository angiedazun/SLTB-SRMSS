import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFoundCard({ title = 'Record Not Found', message = 'This record may have been deleted or does not exist.', backTo, backLabel = 'Go Back' }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-50 to-rose-100 border border-red-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <SearchX size={36} className="text-red-300" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{message}</p>
        <button
          onClick={() => backTo ? navigate(backTo) : navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white text-sm font-bold shadow-md shadow-red-200 hover:from-red-600 hover:to-red-800 transition-all"
        >
          <ArrowLeft size={15} />
          {backLabel}
        </button>
      </div>
    </div>
  );
}
