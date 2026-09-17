export function BarbellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={className}
    >
      <line x1="10" y1="32" x2="54" y2="32" />
      <rect x="3" y="19" width="7" height="26" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="12" y="23" width="5" height="18" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="54" y="19" width="7" height="26" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="47" y="23" width="5" height="18" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
