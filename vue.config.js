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
      }
    }
  }
}
