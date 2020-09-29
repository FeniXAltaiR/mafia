import {shallowMount, createLocalVue} from '@vue/test-utils'
import Vue from 'vue'
import Vuetify from 'vuetify'
import VueI18n from 'vue-i18n'
import VueSocketio from 'vue-socket.io'
import router from '@/router'
import store from '@/store'
// import i18n from '@/i18n'

import App from '@/App.vue'
import Auth from '@/views/Auth.vue'
import Home from '@/views/Home.vue'
import Room from '@/views/Room.vue'

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

describe('App.vue', () => {
  const wrapper = shallowMount(App, {
    localVue,
    router,
    store,
    mocks: {
      $t: jest.fn()
    },
    i18n
  })

  beforeAll(async done => {
    wrapper.vm.$socket.open()
    wrapper.vm.$socket.on('connect', () => done())
  })

  afterAll(async done => {
    await wrapper.vm.$socket.close()
    done()
  })

  it('setBar()', async done => {
    const spy = jest.spyOn(wrapper.vm, 'setBar')

    expect(wrapper.vm.footer).toBe(true)
    expect(wrapper.vm.bar).toBe(true)

    await wrapper.vm.$router.push('/mafia/room')

    expect(spy).toHaveBeenCalled()
    expect(wrapper.vm.footer).toBe(false)
    expect(wrapper.vm.bar).toBe(false)

    done()
  })

  it('toggleDrawer()', () => {
    wrapper.vm.toggleDrawer()
    expect(wrapper.vm.drawer).toBe(true)
  })

  it('goToMainPage()', () => {
    wrapper.vm.goToMainPage()
    expect(wrapper.vm.$route.path).toBe('/')
  })

  it('changeLang()', () => {
    wrapper.vm.changeLang('ru')
    expect(wrapper.vm.$i18n.locale).toBe('ru')
  })

  it('signOut()', () => {
    wrapper.vm.signOut()
    expect(wrapper.vm.menuAccount).toBe(false)
  })
})

describe('Home.vue', () => {
  const spyGetRooms = jest.spyOn(Home.methods, 'getRooms')
  const wrapper = shallowMount(Home, {
    localVue,
    router,
    store,
    mocks: {
      $t: jest.fn()
    },
    i18n
  })

  beforeAll(async done => {
    wrapper.vm.$socket.open()
    // wrapper.vm.$socket.subsribe('getRooms')
    wrapper.vm.$socket.on('connect', () => done())
  })

  afterAll(async done => {
    await wrapper.vm.$socket.close()
    wrapper.vm.$destroy()
    done()
  })

  it('getRooms()', () => {
    expect(spyGetRooms).toBeCalled()
    wrapper.vm.getRooms()
    expect(spyGetRooms).toBeCalledTimes(2)
  })

  it('createRoom()', async () => {
    const spy = jest.spyOn(wrapper.vm, 'goToRoom')

    wrapper.vm.createRoom()
    expect(spy).not.toBeCalled()
    expect(wrapper.vm.$route.params.room).toBeFalsy()

    await wrapper.setData({name: 'test'})

    wrapper.vm.createRoom()
    expect(spy).toBeCalled()
    expect(wrapper.vm.$route.params.room).toBeTruthy()
  })
})

describe('Room.vue', () => {
  Room.methods.setSpeechSettings = jest.fn()
  const wrapper = shallowMount(Room, {
    localVue,
    router,
    store,
    mocks: {
      $t: jest.fn()
    },
    i18n
  })

  beforeAll(async done => {
    wrapper.vm.$socket.open()
    await wrapper.vm.$router.push('/mafia/test')
    wrapper.vm.$socket.on('connect', () => done())
  })

  afterAll(async done => {
    await wrapper.vm.$socket.close()
    done()
  })
})

// describe('Auth.vue', () => {
//   const wrapper = shallowMount(Auth, {
//     localVue,
//     router,
//     store,
//     mocks: {
//       $t: jest.fn()
//     },
//     i18n
//   })

//   beforeAll(async done => {
//     await wrapper.vm.$socket.open()
//     wrapper.vm.$socket.on('connect', () => done())
//   })

//   afterAll(async done => {
//     console.log(wrapper.vm.$socket.id)
//     await wrapper.vm.$socket.close()
//     done()
//   })
// })
