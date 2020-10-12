import {shallowMount} from '@vue/test-utils'
import optionsLocalVue from '../utils/localVue.js'

import Statistics from '@/components/room/statistics.vue'

describe('Room/statistics.vue', () => {
  const wrapper = shallowMount(Statistics, {
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

  it('openDialogStat()', () => {
    wrapper.vm.openDialogStat()
    expect(wrapper.vm.dialogStat.value).toBe(true)
  })
})
