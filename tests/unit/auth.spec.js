import {shallowMount} from '@vue/test-utils'
import optionsLocalVue from '../utils/localVue.js'

import Auth from '@/views/Auth.vue'

jest.mock('firebaseui', () => {
  function AuthUI() {
    this.start = () => {
      return jest.fn()
    }
  }
  AuthUI.getInstance = () => {
    return undefined
  }

  const mocks = {
    auth: {
      AuthUI
    }
  }

  return mocks
})

jest.mock('firebase', () => {
  function auth() {}
  auth.GoogleAuthProvider = {
    PROVIDER_ID: 'provider'
  }
  auth.GithubAuthProvider = {
    PROVIDER_ID: 'provider'
  }

  const mocks = {
    auth
  }

  return mocks
})

describe('Auth.vue', () => {
  const wrapper = shallowMount(Auth, {
    ...optionsLocalVue,
    mocks: {
      $t: jest.fn()
    }
  })

  beforeAll(async done => {
    await wrapper.vm.$socket.open()
    await wrapper.vm.$router.push('/auth')
    wrapper.vm.$socket.on('connect', () => done())
  })

  afterAll(async done => {
    await wrapper.vm.$socket.close()
    await wrapper.vm.$destroy()
    done()
  })

  it('signInSuccessWithAuthResult()', async () => {
    wrapper.vm.uiConfig.callbacks.signInSuccessWithAuthResult({user: {name: 'fenix'}}, null)
    await wrapper.vm.$router.push('/auth')
    expect(wrapper.vm.$store.state.user_data.name).toBe('fenix')
  })
})
