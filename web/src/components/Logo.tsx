export function Logo({ className = '' }: { className?: string }) {
  return (
    <span role="img" aria-label="Lot a Lot" className={className}
      style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontWeight: 700 }}>
      <span aria-hidden="true">L</span>
      <svg viewBox="0 0 30 34" style={{ width: '.78em', height: '.88em', margin: '0 .02em' }} aria-hidden="true" focusable="false">
        <circle cx="15" cy="20" r="12" fill="#E63946" />
        <ellipse cx="10.5" cy="16.5" rx="2.2" ry="3.6" fill="#fff" opacity=".35" />
        <path d="M15 9c-2.5 2-6 2-8 .5 2 3.5 5.5 4 8 2 2.5 2 6 1.5 8-2-2 1.5-5.5 1.5-8-.5z" fill="#3FA34D" />
      </svg>
      <span aria-hidden="true">t a L</span>
      <svg viewBox="0 0 30 34" style={{ width: '.78em', height: '.88em', margin: '0 .02em' }} aria-hidden="true" focusable="false">
        <circle cx="15" cy="20" r="12" fill="#7BC95F" stroke="#2E7D38" strokeWidth="2" />
        <ellipse cx="10.5" cy="16.5" rx="2.2" ry="3.6" fill="#fff" opacity=".35" />
        <path d="M15 8c1-3 4-5 7-4" stroke="#2E7D38" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <span aria-hidden="true">t</span>
    </span>
  );
}
