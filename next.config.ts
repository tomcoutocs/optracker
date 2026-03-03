import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // Bypass Vercel image optimization to avoid transformation quota usage.
    // Images load directly from source (tcggo, optcgapi, Supabase).
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.tcggo.com", pathname: "/**" },
      { protocol: "https", hostname: "optcgapi.com", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/avatars/**" },
    ],
  },
};

export default nextConfig;
