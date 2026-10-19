/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    // lets next/image resize and compress logos that live on ESPN's server
    remotePatterns: [{ protocol: "https", hostname: "a.espncdn.com" }],
        minimumCacheTTL: 2592000, // keep resized logos for 30 days
  },
};

export default nextConfig;