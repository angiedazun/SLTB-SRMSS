import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, suffix, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          className={`input ${Icon ? 'pl-10' : ''} ${suffix ? 'pr-12' : ''} ${error ? 'border-red-400 focus:ring-red-400/50 focus:border-red-400' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 mt-1.5 text-xs text-red-500">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
});

export default Input;

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <textarea
        className={`input resize-none ${error ? 'border-red-400' : ''} ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
