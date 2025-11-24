module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ignore source map loader errors for node_modules
      webpackConfig.module.rules = webpackConfig.module.rules.map((rule) => {
        if (rule.enforce === 'pre' && rule.loader && rule.loader.includes('source-map-loader')) {
          return {
            ...rule,
            exclude: /node_modules/,
          };
        }
        return rule;
      });
      
      return webpackConfig;
    },
  },
};

