import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Artwork is served from AniList's own CDN, at the URLs its API returns.
    remotePatterns: [{ protocol: "https", hostname: "s4.anilist.co", pathname: "/file/anilistcdn/**" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  turbopack: {
    // Pin the workspace root to this folder; otherwise a lockfile higher up the tree can be picked instead.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
