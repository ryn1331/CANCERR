export default function RNCLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="3.5" opacity="0.15" />
      <circle cx="60" cy="60" r="54" stroke="url(#logoGrad)" strokeWidth="3.5"
        strokeDasharray="12 6" strokeLinecap="round" />
      <circle cx="60" cy="60" r="42" fill="currentColor" opacity="0.08" />
      <rect x="52" y="32" width="16" height="40" rx="3" fill="url(#logoGrad)" />
      <rect x="40" y="44" width="40" height="16" rx="3" fill="url(#logoGrad)" />
      <rect x="70" y="74" width="7" height="16" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="80" y="68" width="7" height="22" rx="1.5" fill="currentColor" opacity="0.65" />
      <rect x="90" y="62" width="7" height="28" rx="1.5" fill="currentColor" opacity="0.8" />
      <polyline points="24,80 36,80 42,68 48,88 54,72 60,80 68,80"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" fill="none" />
      <defs>
        <linearGradient id="logoGrad" x1="30" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(213 80% 55%)" />
          <stop offset="0.5" stopColor="hsl(200 75% 52%)" />
          <stop offset="1" stopColor="hsl(170 60% 45%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
