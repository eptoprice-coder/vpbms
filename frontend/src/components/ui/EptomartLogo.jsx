// Eptomart brand mark — cart + leaf icon with the wordmark, matching the
// provided brand logo (green "epto" / orange "mart", amber cart, green leaf).
export default function EptomartLogo({ showWordmark = true, showTagline = false, size = 36, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="eptomart-cart" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="eptomart-leaf" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        {/* cart antenna dots */}
        <circle cx="18" cy="10" r="2" fill="url(#eptomart-cart)" />
        <circle cx="25" cy="8" r="2" fill="url(#eptomart-cart)" />
        <circle cx="32" cy="10" r="2" fill="url(#eptomart-cart)" />
        <path d="M18 12 L20 26 M25 10 L26 26 M32 12 L31 26" stroke="url(#eptomart-cart)" strokeWidth="2" strokeLinecap="round" />
        {/* leaf */}
        <path
          d="M30 6 C38 4 46 8 48 16 C40 18 32 16 30 6 Z"
          fill="url(#eptomart-leaf)"
        />
        {/* cart body (rounded "e" + basket) */}
        <path
          d="M6 18 H14 L18 40 H42 C46 40 48 38 49 34 L52 24 H20"
          stroke="url(#eptomart-cart)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="22" cy="48" r="3.5" fill="url(#eptomart-cart)" />
        <circle cx="38" cy="48" r="3.5" fill="url(#eptomart-cart)" />
      </svg>

      {showWordmark && (
        <div className="leading-tight">
          <div className="font-extrabold text-lg tracking-tight">
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">epto</span>
            <span className="bg-gradient-to-r from-accent-500 to-accent-700 bg-clip-text text-transparent">mart</span>
          </div>
          {showTagline && (
            <div className="text-[10px] text-gray-400 -mt-0.5">Premium Products. Trusted Quality.</div>
          )}
        </div>
      )}
    </div>
  );
}
