// Eptomart brand mark — transparent-background version so it blends with any surface.
// (wordmark and tagline are baked into the image, so no extra text is rendered here).
export default function EptomartLogo({ size = 40, className = '' }) {
  return (
    <img
      src="/eptomart-logo-transparent.png"
      alt="Eptomart"
      style={{ height: size, width: 'auto', filter: 'drop-shadow(0 4px 18px rgba(34,197,94,0.35)) drop-shadow(0 2px 10px rgba(249,115,22,0.25))' }}
      className={className}
    />
  );
}
