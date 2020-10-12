import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user_data: {},
    game: {
      name: '',
      room: null,
      password: '',
      limit: 10,
      nominateIndex: 1,
      duration: 0,
      gameSteps: [],
      gameInfo: {},
      statistics: [],
      isPause: false,
      gameIsStarted: false,
      isSecondVoting: false
    },
    peerConnections: [],
    timer: null
  },
  getters: {
    userData: state => state.user_data,
    game: state => state.game,
    peerConnections: state => state.peerConnections
  },
  mutations: {
    SET_USER_DATA: (state, data) => {
      state.user_data = data
    },
    SET_GAME: (state, options) => {
      Object.entries(options).forEach(([key, value]) => {
        state.game[key] = value
      })
    },
    ADD_PEER_CONNECTIONS: (state, pc) => {
      state.peerConnections.push(pc)
    },
    DELETE_PEER_CONNECTIONS: (state, id) => {
      state.peerConnections = state.peerConnections.filter(pc => pc.id !== id)
    },
    CLEAR_PEER_CONNECTIONS: state => {
      state.peerConnections = []
    },
    SET_TIMER: (state, timer) => {
      state.timer = timer
    },
    CLEAR_TIMER: state => {
      clearInterval(state.timer)
      state.timer = null
    }
  },
  actions: {},
  modules: {}
})
