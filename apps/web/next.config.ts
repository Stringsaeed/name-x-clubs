import path from 'node:path';
import { linguiMacroSwcPlugin } from '@lingui/swc-plugin/options';
import type { NextConfig } from 'next';

// pnpm keeps the workspace install at the repository root, two levels above this app.
const monorepoRoot = path.join(import.meta.dirname, '../..');

const config: NextConfig = {
  transpilePackages: ['@nxc/game'],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    swcPlugins: [linguiMacroSwcPlugin()],
  },
  allowedDevOrigins: ['192.168.1.138', '127.0.0.1', 'localhost'],
};

export default config;
