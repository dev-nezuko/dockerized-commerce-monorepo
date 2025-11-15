/** Small bottle glyph used as the brand mark; decorative. */
export function BottleMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="12" y="3" width="8" height="5" rx="1.5" fill="#d8b38e" />
      <path d="M11.5 8h9v3.2c0 1.5 2.5 2.8 2.5 5V26c0 2.2-1.8 3-7 3s-7-.8-7-3v-9.8c0-2.2 2.5-3.5 2.5-5z" fill="#3f6c5a" />
      <path d="M12.5 16v8" stroke="#a9c6b3" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
