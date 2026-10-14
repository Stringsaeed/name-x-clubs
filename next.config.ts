import { linguiMacroSwcPlugin } from '@lingui/swc-plugin/options';
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    swcPlugins: [linguiMacroSwcPlugin()],
  },
};

export default config;
