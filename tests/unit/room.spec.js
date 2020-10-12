import {shallowMount} from '@vue/test-utils'
import optionsLocalVue from '../utils/localVue.js'

import Room from '@/views/Room.vue'

// jest.mock('window', () => ({

// }))

describe('Room.vue', () => {
  global.speechSynthesis = {
    getVoices: jest.fn(() => [])
  }
  global.SpeechSynthesisUtterance = jest.fn()

  const mockMethod = jest.spyOn(Room.methods, 'setSpeechSettings')

  const wrapper = shallowMount(Room, {
    ...optionsLocalVue,
    mocks: {
      $t: jest.fn()
    }
  })

  beforeAll(async done => {
    wrapper.vm.$socket.open()
    await wrapper.vm.$router.push('/mafia/test')
    wrapper.vm.$socket.on('connect', () => done())
  })

  afterAll(async done => {
    await wrapper.vm.$socket.close()
    wrapper.vm.$destroy()
    done()
  })

  it('setSpeechSettings()', () => {
    expect(mockMethod).toHaveBeenCalled()
  })
})
