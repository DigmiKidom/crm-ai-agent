/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enables app/global-not-found.js. Next 16 renders a 404 detached from the
    // root layout, so an ordinary not-found.js has no <html> to carry `lang`
    // and `dir` — which on an RTL locale makes the 404 the one page in the app
    // laid out backwards. global-not-found.js owns the whole document instead.
    globalNotFound: true,
  },
};

export default nextConfig;
