module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', 
        { 
          jsxImportSource: 'nativewind'
        }],
      'nativewind/babel',
    ],
    plugins: [
      'module:react-native-dotenv', 
      ["module-resolver", {
        root: ["./"],
        alias: {
          "@": "./",
          "tailwind.config": "./tailwind.config.js"
        }
      }],
      ['react-native-reanimated/plugin', {
        // enableDebug: false, // Disable debug logging
        // strict: false,      // Disable strict mode
      }],
    ],
  };
};
