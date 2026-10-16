import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the generated index is bundled with the server output.
  outputFileTracingIncludes: { "/": ["./data/index.json"] },
};

export default nextConfig;
