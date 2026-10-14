// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enforce ASCII-only serialization to prevent encoding mismatches in browsers (Mojibake)
if (config.transformer) {
  config.transformer.minifierConfig = {
    ...config.transformer.minifierConfig,
    compress: {
      ...config.transformer.minifierConfig?.compress,
      comparisons: false,
    },
    output: {
      ...config.transformer.minifierConfig?.output,
      ascii_only: true, // Escape all non-ASCII characters to \uXXXX sequences to avoid charset mismatch in browsers
    },
  };
}

module.exports = config;
