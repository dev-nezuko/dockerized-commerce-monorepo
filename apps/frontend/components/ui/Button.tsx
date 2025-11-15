import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

const VARIANTS = {
  primary: 'bg-forest-800 text-cream hover:bg-forest-950',
  secondary: 'border border-moss-600 bg-white text-forest-950 hover:bg-sage-50',
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 font-semibold transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
