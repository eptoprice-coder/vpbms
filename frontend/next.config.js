/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export: the whole app is client-rendered and talks to the API via
  // NEXT_PUBLIC_API_URL (see src/lib/api.js), so no Next.js server is required.
  // This lets the build output (the `out/` folder) be hosted on Cloudflare Pages.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
