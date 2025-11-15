import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors motion-safe:hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const styles = variant === 'primary'
    ? 'bg-black text-white focus-visible:ring-black'
    : 'bg-gray-100 text-gray-900 focus-visible:ring-gray-300';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
