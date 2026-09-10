import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, h } from 'vue'
import { useResizableWidth } from '../../composables/useResizableWidth'

const COOKIE_NAME = 'test_content_width'

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
    const contentEl = ref(null)
    const { startResize } = useResizableWidth(COOKIE_NAME, contentEl, 300)
    expose({ contentEl, startResize })
    return () => h('div', { ref: contentEl }, 'content')
  },
})

describe('useResizableWidth', () => {
  beforeEach(() => {
    clearCookie(COOKIE_NAME)
  })

  it('stosuje domyślną szerokość, gdy nie ma cookie', () => {
    const wrapper = mount(TestComponent)
    expect(wrapper.vm.contentEl.style.width).toBe('300px')
  })

  it('przywraca szerokość z cookie przy montowaniu', () => {
    document.cookie = `${COOKIE_NAME}=555`
    const wrapper = mount(TestComponent)
    expect(wrapper.vm.contentEl.style.width).toBe('555px')
  })

  it('podczas przeciągania zmienia szerokość na żywo', () => {
    const wrapper = mount(TestComponent)
    const { contentEl, startResize } = wrapper.vm
    mockRect(contentEl, 300)

    startResize({ clientX: 100, preventDefault: () => {} })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }))

    expect(contentEl.style.width).toBe('350px')
  })

  it('po puszczeniu myszki zapisuje finalną szerokość w cookie', () => {
    const wrapper = mount(TestComponent)
    const { contentEl, startResize } = wrapper.vm
    mockRect(contentEl, 300)

    startResize({ clientX: 100, preventDefault: () => {} })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))
    mockRect(contentEl, 400)

    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(contentEl.style.width).toBe('400px')
    expect(document.cookie).toContain(`${COOKIE_NAME}=400`)
  })

  it('nie pozwala zejść poniżej minimalnej szerokości', () => {
    const wrapper = mount(TestComponent)
    const { contentEl, startResize } = wrapper.vm
    mockRect(contentEl, 300)

    startResize({ clientX: 100, preventDefault: () => {} })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: -1000 }))

    expect(contentEl.style.width).toBe('280px')
  })

  it('nie pozwala rozciągnąć szerzej niż szerokość okna (żeby nie psuć wyśrodkowania)', () => {
    const originalWidth = window.innerWidth
    window.innerWidth = 800

    const wrapper = mount(TestComponent)
    const { contentEl, startResize } = wrapper.vm
    mockRect(contentEl, 300)

    startResize({ clientX: 100, preventDefault: () => {} })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 5000 }))

    expect(contentEl.style.width).toBe(`${800 - 48}px`)

    window.innerWidth = originalWidth
  })
})
