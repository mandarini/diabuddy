import { type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className = '', ...props }: InputProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-stone-600 mb-1.5">{label}</span>}
      <input
        className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all ${className}`}
        {...props}
      />
      {hint && <span className="block text-xs text-stone-400 mt-1">{hint}</span>}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-stone-600 mb-1.5">{label}</span>}
      <select
        className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
