import type { NextConfig } from "next";

/** Supabase Storage 호스트. 경매 이미지가 여기서 온다 (데이터 모델 §11.5) */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "vtkeruqexphuvritwkyt.supabase.co";

const nextConfig: NextConfig = {
  // 상위 폴더에 다른 lockfile 이 있어 Turbopack 이 루트를 잘못 잡는다. 못 박아 둔다
  turbopack: { root: import.meta.dirname },

  images: {
    // domains 는 폐기됐다. remotePatterns 를 쓴다 (Next 16)
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      // 소셜 프로필 이미지 — 제공자가 주는 주소를 그대로 저장한다 (F10 3.3)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "k.kakaocdn.net" },
      { protocol: "https", hostname: "img1.kakaocdn.net" },
      { protocol: "http", hostname: "k.kakaocdn.net" },
      { protocol: "http", hostname: "img1.kakaocdn.net" },
    ],
  },
};

export default nextConfig;
