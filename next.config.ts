import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_IS_STATIC_EXPORT: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
