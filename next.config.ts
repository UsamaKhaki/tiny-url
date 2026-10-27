import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores lockfiles in parent folders.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
