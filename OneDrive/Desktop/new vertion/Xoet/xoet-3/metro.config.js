// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enforce UTF-8 serialization and prevent minifier from mangling multi-byte Unicode strings
if (config.transformer) {
  config.transformer.minifierConfig = {
    ...config.transformer.minifierConfig,
    compress: {
      ...config.transformer.minifierConfig?.compress,
      comparisons: false,
    },
    output: {
      ...config.transformer.minifierConfig?.output,
      ascii_only: false, // Ensure raw UTF-8 characters are preserved without ASCII-only escape constraints
    },
  };
}

module.exports = config;
