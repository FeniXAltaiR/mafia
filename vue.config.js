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
        target: 'http://localhost:7000',
        changeOrigin: true
      },
      '/test': {
        // target: 'http://89.108.103.9:7000',
        target: 'https://mafiozi.xyz',
        changeOrigin: true
      },
      '/sock': {
        target: 'http://89.108.103.9:7000',
        // target: 'https://mafiozi.xyz',
        changeOrigin: true
      }
    }
  }
}
