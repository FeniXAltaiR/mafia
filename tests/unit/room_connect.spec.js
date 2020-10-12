import {shallowMount} from '@vue/test-utils'
import optionsLocalVue from '../utils/localVue.js'

import Connect from '@/components/room/connect.vue'

describe('Room/connect.vue', () => {
  const wrapper = shallowMount(Connect, {
    ...optionsLocalVue,
    mocks: {
      $t: jest.fn()
    }
  })

  beforeAll(async done => {
    global.navigator.mediaDevices = {
      getUserMedia: () =>
        new Promise((resolve, reject) => {
          resolve()
        })
    }
    wrapper.vm.$socket.open()
    await wrapper.vm.$router.push('/mafia/test')
    wrapper.vm.$socket.on('connect', () => done())
  })

  afterAll(async done => {
    await wrapper.vm.$socket.close()
    wrapper.vm.$destroy()
    done()
  })

  it('init()', () => {
    wrapper.vm.init('getUserMedia')
    wrapper.vm.gotStream()
    expect(wrapper.vm.peerConnections[0].room).toBe('test')
  })
})
