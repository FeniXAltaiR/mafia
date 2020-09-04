import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user_data: {}
  },
  getters: {
    userData: state => state.user_data
  },
  mutations: {
    SET_USER_DATA: (state, data) => {
      state.user_data = data
    }
  },
  actions: {},
  modules: {}
})
