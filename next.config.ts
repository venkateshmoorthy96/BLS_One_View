import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The server reads the CSV dataset from public/data at runtime, so ship those files with the serverless functions on Vercel
  outputFileTracingIncludes: { "/**": ["./public/data/**/*.csv"] },
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
