// Eptomart brand mark — uses the actual logo file at /public/eptomart-logo.png
// (wordmark and tagline are already baked into the image, so no extra text is rendered here).
export default function EptomartLogo({ size = 40, className = '' }) {
  return (
    <img
      src="/eptomart-logo.png"
      alt="Eptomart"
      style={{ height: size, width: 'auto' }}
      className={`rounded-xl ${className}`}
    />
  );
}
