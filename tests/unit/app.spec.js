import {shallowMount} from '@vue/test-utils'
import optionsLocalVue from '../utils/localVue.js'

import App from '@/App.vue'

jest.mock('firebase', () => ({
  auth: () => ({
    signOut: jest.fn(),
    onAuthStateChanged(fn) {
      return fn({displayName: 'fenix'})
    }
  }),
  initializeApp: jest.fn()
}))

describe('App.vue', () => {
  const wrapper = shallowMount(App, {
    ...optionsLocalVue,
    mocks: {
      $t: jest.fn()
    }
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

  it('localStorage displayName', () => {
    expect(localStorage.getItem('displayName')).toBe('fenix')
  })
})
