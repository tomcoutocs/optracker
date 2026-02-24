/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.tcggo.com", pathname: "/**" },
      { protocol: "https", hostname: "optcgapi.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
