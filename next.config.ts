import { linguiMacroSwcPlugin } from '@lingui/swc-plugin/options';
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    swcPlugins: [linguiMacroSwcPlugin()],
  },
  allowedDevOrigins: ['192.168.1.138', '127.0.0.1', 'localhost'],
};

export default config;
