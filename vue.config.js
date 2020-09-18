module.exports = {
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: false
    }
  },
  devServer: {
    proxy: {
      '/login': {
        // target: 'https://mafiozi.xyz',
        target: 'http://localhost:7000',
        changeOrigin: true
      },
      '/test': {
        // target: 'https://mafiozi.xyz',
        target: 'http://localhost:7000',
        changeOrigin: true
      },
      '/sock': {
        // target: 'https://mafiozi.xyz',
        target: 'http://localhost:7000',
        changeOrigin: true
      }
    }
  }
}
