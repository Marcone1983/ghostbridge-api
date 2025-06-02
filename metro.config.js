const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      crypto: 'react-native-crypto',
      stream: 'readable-stream',
      buffer: 'buffer',
      vm: 'vm-browserify',
      constants: 'constants-browserify',
      os: 'os-browserify',
      path: 'path-browserify',
      string_decoder: 'string_decoder',
      util: 'util',
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
