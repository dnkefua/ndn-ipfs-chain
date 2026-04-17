/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // `standalone` emits a self-contained server bundle at .next/standalone so the Docker
  // image can run `node server.js` without needing node_modules copied — cuts image size
  // from ~1.2 GB to ~180 MB and makes Cloud Run cold-starts noticeably faster.
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
