import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 on natiivmoodul, seda ei pakita serveri bundle'isse
  serverExternalPackages: ["better-sqlite3"],
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
