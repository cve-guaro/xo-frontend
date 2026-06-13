module.exports = function (api) {
  api.cache(true);
  
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';
  const plugins = [];
  
  if (isProd) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }
  return {
    presets: [
      ['babel-preset-expo', {
        targets: { browsers: ['last 2 Chrome versions', 'last 2 Safari versions'] }
      }]
    ],
    plugins,
  };
};
