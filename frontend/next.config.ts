import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** Render (or other) API origin. Unset locally so the browser talks to localhost:3001. */
const apiRewriteOrigin = process.env.API_REWRITE_ORIGIN?.replace(/\/$/, '') ?? '';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    if (!apiRewriteOrigin) {
      return [];
    }
    return [
      { source: '/api/:path*', destination: `${apiRewriteOrigin}/api/:path*` },
      { source: '/health', destination: `${apiRewriteOrigin}/health` },
      { source: '/health/:path*', destination: `${apiRewriteOrigin}/health/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
