import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const configDirRealPath = fs.realpathSync(configDir);

const nextConfig: NextConfig = {
  turbopack: {
    root: configDirRealPath,
  },
};

export default nextConfig;
