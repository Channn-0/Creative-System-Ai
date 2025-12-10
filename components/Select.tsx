import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="w-full">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative">
        <select
          className={`
            w-full appearance-none 
            bg-white dark:bg-slate-900 
            border border-slate-200 dark:border-slate-700 
            text-slate-900 dark:text-slate-200 
            text-sm rounded-xl
            focus:ring-2 focus:ring-brand-400 focus:border-transparent 
            block p-3 pr-8
            transition-all duration-200
            disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
    </div>
  );
};