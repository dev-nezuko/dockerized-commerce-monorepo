import React from 'react';

import { fieldClass } from './Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', ...props },
  ref,
) {
  return <textarea ref={ref} className={`${fieldClass} ${className}`} {...props} />;
});
