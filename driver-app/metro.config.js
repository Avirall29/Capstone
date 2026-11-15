// Lets the app import dependency-free shared code (design tokens, i18n, geo, incident reasons)
// from ../shared as `transit-shared/...`.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const sharedDir = path.resolve(__dirname, '../shared');
const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders || []), sharedDir];
config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules || {}), 'transit-shared': sharedDir };

module.exports = config;
