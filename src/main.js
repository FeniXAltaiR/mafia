import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import '@/assets/css/index.css'

import VueSocketio from 'vue-socket.io'
import vuetify from './plugins/vuetify'
import '@babel/polyfill'
import i18n from './i18n'
Vue.use(
  new VueSocketio({
    // debug: true,
    connection: 'http://localhost:7000/sock'
  })
)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  vuetify,
  i18n,
  render: h => h(App)
}).$mount('#app')
