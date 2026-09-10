import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, h } from 'vue'
import { useResizableWidth } from '../../composables/useResizableWidth'

const COOKIE_NAME = 'test_panels_width'

function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function mockRect(el, width) {
  el.getBoundingClientRect = () => ({
    width, right: width, bottom: 100, left: 0, top: 0, height: 100, x: 0, y: 0, toJSON() {},
  })
}

const TestComponent = defineComponent({
  setup(_, { expose }) {
    const elA = ref(null)
    const elB = ref(null)
    const { startResize, resizingEl } = useResizableWidth(COOKIE_NAME, [elA, elB], 300)
    expose({ elA, elB, startResize, resizingEl })
    return () => h('div', [h('div', { ref: elA }, 'A'), h('div', { ref: elB }, 'B')])
  },
})

describe('useResizableWidth', () => {
  beforeEach(() => {
    clearCookie(COOKIE_NAME)
  })

  it('stosuje domyślną szerokość na obu elementach, gdy nie ma cookie', () => {
    const wrapper = mount(TestComponent)
    expect(wrapper.vm.elA.style.width).toBe('300px')
    expect(wrapper.vm.elB.style.width).toBe('300px')
  })

  it('przywraca szerokość z cookie przy montowaniu', () => {
    document.cookie = `${COOKIE_NAME}=555`
    const wrapper = mount(TestComponent)
    expect(wrapper.vm.elA.style.width).toBe('555px')
    expect(wrapper.vm.elB.style.width).toBe('555px')
  })

  it('podczas przeciągania zmienia na żywo tylko przeciągany element', () => {
    const wrapper = mount(TestComponent)
    const { elA, elB, startResize } = wrapper.vm
    mockRect(elA, 300)

    startResize({ clientX: 100, preventDefault: () => {} }, elA)
    expect(wrapper.vm.resizingEl).toBe(elA)

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }))

    expect(elA.style.width).toBe('350px')
    expect(elB.style.width).toBe('300px')
  })

  it('po puszczeniu myszki synchronizuje drugi element i zapisuje cookie', () => {
    const wrapper = mount(TestComponent)
    const { elA, elB, startResize } = wrapper.vm
    mockRect(elA, 300)

    startResize({ clientX: 100, preventDefault: () => {} }, elA)
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))
    mockRect(elA, 400)

    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(elA.style.width).toBe('400px')
    expect(elB.style.width).toBe('400px')
    expect(wrapper.vm.resizingEl).toBe(null)
    expect(document.cookie).toContain(`${COOKIE_NAME}=400`)
  })

  it('nie pozwala zejść poniżej minimalnej szerokości', () => {
    const wrapper = mount(TestComponent)
    const { elA, startResize } = wrapper.vm
    mockRect(elA, 300)

    startResize({ clientX: 100, preventDefault: () => {} }, elA)
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: -1000 }))

    expect(elA.style.width).toBe('280px')
  })
})
