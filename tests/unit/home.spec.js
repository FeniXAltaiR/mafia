import {shallowMount} from '@vue/test-utils'
import {optionsLocalVue, fakePromise} from '../utils'

import Home from '@/views/Home.vue'

describe('Home.vue', () => {
  const spyGetRooms = jest.spyOn(Home.methods, 'getRooms')
  const wrapper = shallowMount(Home, {
    ...optionsLocalVue,
    mocks: {
      $t: jest.fn()
    }
  })

  beforeAll(async done => {
    wrapper.vm.$socket.open()
    wrapper.vm.$socket.on('connect', done)
  })

  afterAll(async done => {
    await fakePromise(2000)
    await wrapper.vm.$socket.close()
    wrapper.vm.$destroy()
    done()
  })

  it('getRooms()', async () => {
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
