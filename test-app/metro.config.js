const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// The local lib package (symlinked via file: dependency)
const libPath = path.resolve(__dirname, '../expo-session-capture');

// Tell Metro to also watch the lib folder for changes
config.watchFolders = [libPath];

// Force ALL shared dependencies to resolve from test-app's node_modules
// This prevents duplicate React / React Native copies
const testAppModules = path.resolve(__dirname, 'node_modules');
config.resolver.extraNodeModules = new Proxy(
  {},
  { get: (_target, name) => path.join(testAppModules, String(name)) },
);

// Block Metro from looking into the lib's own node_modules (if they exist)
config.resolver.blockList = [
  new RegExp(path.resolve(libPath, 'node_modules').replace(/[/\\]/g, '[/\\\\]') + '/.*'),
];

module.exports = config;
