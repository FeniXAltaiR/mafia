import {createLocalVue} from '@vue/test-utils'
import Vue from 'vue'
import Vuetify from 'vuetify'
import VueI18n from 'vue-i18n'
import VueSocketio from 'vue-socket.io'
import router from '@/router'
import store from '@/store'
// import i18n from '@/i18n'

Vue.use(Vuetify)
Vue.use(VueI18n)
const localVue = createLocalVue()
localVue.use(Vuetify)
localVue.use(
  new VueSocketio({
    // debug: true,
    connection: 'http://localhost:7000/sock',
    options: {
      query: {
        global_id: localStorage.getItem('id')
      }
    }
  })
)
const i18n = new VueI18n()

export default {
  localVue,
  router,
  store,
  i18n
}
