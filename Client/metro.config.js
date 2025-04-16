const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
// Add .cjs support for Firebase
config.resolver.sourceExts.push('cjs');

module.exports = withNativeWind(config, { input: './global.css' });