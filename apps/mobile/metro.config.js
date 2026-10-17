const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

// cuelume-native's React Native entry is TypeScript source that imports siblings with `.js`
// specifiers (Node ESM style). Metro does not map `./x.js` to `./x.ts`, so strip the extension
// and let Metro try its own source extensions.
const esmTypeScriptPackages = ['cuelume-native'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromEsmTsPackage = esmTypeScriptPackages.some((name) =>
    context.originModulePath.includes(`${path.sep}${name}${path.sep}src${path.sep}`),
  );

  if (fromEsmTsPackage && moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    return context.resolveRequest(context, moduleName.slice(0, -3), platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
