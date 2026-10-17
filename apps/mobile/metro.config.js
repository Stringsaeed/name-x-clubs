const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const webRoot = path.resolve(projectRoot, '../web');

const config = getDefaultConfig(projectRoot);

// The matching engine, club catalog, and crest files live in the web app.
config.watchFolders = [webRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(webRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
