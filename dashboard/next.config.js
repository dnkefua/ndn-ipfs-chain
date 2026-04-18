/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // `standalone` emits a self-contained server bundle at .next/standalone so the Docker
  // image can run `node server.js` without needing node_modules copied — cuts image size
  // from ~1.2 GB to ~180 MB and makes Cloud Run cold-starts noticeably faster.
  output: 'standalone',
  // ESM-only packages used in Server Components
  transpilePackages: ['react-markdown', 'remark-gfm', 'remark-parse', 'unified', 'vfile', 'micromark', 'mdast-util-from-markdown', 'mdast-util-to-hast', 'hast-util-to-jsx-runtime'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
