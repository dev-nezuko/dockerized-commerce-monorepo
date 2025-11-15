import React from 'react';

export const fieldClass = 'w-full rounded-xl border border-moss-600 bg-white px-4 py-3 text-ink placeholder:text-ink-soft aria-[invalid=true]:border-clay-700';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} className={`${fieldClass} ${className}`} {...props} />;
});
