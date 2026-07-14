// Professional brand attribution used on the login screen and app sidebar.
// compact: tighter version for the sidebar footer.
export default function PoweredBy({ compact = false, className = '' }) {
  if (compact) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-[11px] text-gray-400">
          Powered by{' '}
          <span className="font-semibold bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
            Eptomart
          </span>
        </p>
        <p className="text-[9px] tracking-[0.18em] uppercase text-gray-500 dark:text-gray-500 mt-0.5">
          An Eptosi Group Company
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* gradient divider */}
      <div className="h-px w-40 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent mb-4" aria-hidden="true" />
      <p className="text-sm text-gray-300">
        Powered by{' '}
        <span className="font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
          Eptomart
        </span>
      </p>
      <p className="text-[11px] text-gray-400 mt-1">
        Eptosi Smart Solutions <span className="text-gray-500 mx-1">·</span> Technology that grows your business
      </p>
      <p className="text-[10px] tracking-[0.22em] uppercase text-gray-500 mt-2">
        An Eptosi Group Company
      </p>
    </div>
  );
}
