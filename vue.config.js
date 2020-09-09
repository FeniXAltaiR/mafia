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
        target: 'https://mafiozi.xyz',
        changeOrigin: true
      },
      '/test': {
        target: 'https://mafiozi.xyz',
        changeOrigin: true
      },
      '/sock': {
        target: 'https://mafiozi.xyz',
        changeOrigin: true
      }
    }
  }
}
