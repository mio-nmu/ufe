import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // YouTube video posters (auto-derived thumbnails on /videos tiles).
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      // Admin-uploaded imagery (albums, news covers) served by Cloudinary.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async redirects() {
    return [
      // Public pages were renamed from Mongolian transliterations to
      // minimal English slugs; keep old links working.
      { source: "/toglogchid", destination: "/players", permanent: true },
      { source: "/player", destination: "/players", permanent: true },
      { source: "/tuuh", destination: "/history", permanent: true },
      { source: "/udirdlaga", destination: "/front-office", permanent: true },
      // /staff merged into the front-office directory page.
      { source: "/staff", destination: "/front-office", permanent: true },
      // Fan accounts have no features yet — sign-up is closed (admins log
      // in at /login). Remove this line to reopen registration.
      { source: "/register", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
