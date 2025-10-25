import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/millian", destination: "/", permanent: true },
      {
        source: "/millian/social-media-lead-generation",
        destination: "/social-media-lead-generation",
        permanent: true,
      },
      {
        source: "/millian/affiliate-marketing",
        destination: "/affiliate-marketing",
        permanent: true,
      },
      {
        source: "/millian/software-automations",
        destination: "/software-automations",
        permanent: true,
      },
      {
        source: "/millian/solutions/creators",
        destination: "/solutions/creators",
        permanent: true,
      },
      {
        source: "/millian/solutions/affiliates",
        destination: "/solutions/affiliates",
        permanent: true,
      },
      { source: "/millian/cranads", destination: "/cranads", permanent: true },
      { source: "/millian/book-demo", destination: "/book-demo", permanent: true },
      { source: "/millian/get-started", destination: "/get-started", permanent: true },
    ];
  },
};

export default nextConfig;
