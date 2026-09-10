import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TestDetailModal from '../../components/TestDetailModal.vue'

describe('TestDetailModal', () => {
  it('nic nie renderuje, gdy test jest null', () => {
    const wrapper = mount(TestDetailModal, { props: { test: null } })
    expect(wrapper.find('[data-testid="test-modal-backdrop"]').exists()).toBe(false)
  })

  it('pokazuje tytuł i etykietę statusu', () => {
    const wrapper = mount(TestDetailModal, {
      props: { test: { id: 1, title: 'Mój test', status_id: 5 } },
    })
    expect(wrapper.text()).toContain('Mój test')
    expect(wrapper.text()).toContain('Failed')
  })

  it('renderuje pola custom_* z sformatowaną nazwą, pomija puste i pola nie-custom', () => {
    const wrapper = mount(TestDetailModal, {
      props: {
        test: {
          id: 1,
          title: 'T',
          status_id: 1,
          run_id: 242,
          custom_preconds: 'Warunki wstępne',
          custom_expected: '',
        },
      },
    })
    expect(wrapper.text()).toContain('Preconds')
    expect(wrapper.text()).toContain('Warunki wstępne')
    expect(wrapper.text()).not.toContain('Expected')
    expect(wrapper.text()).not.toContain('run_id')
    expect(wrapper.text()).not.toContain('242')
  })

  it('sanityzuje HTML w polach rich-text — usuwa <script> i on* atrybuty', () => {
    const wrapper = mount(TestDetailModal, {
      props: {
        test: {
          id: 1,
          title: 'T',
          status_id: 1,
          custom_steps: '<p onclick="alert(1)">Krok 1</p><script>alert(2)</script>',
        },
      },
    })
    const dd = wrapper.find('.rich-text')
    expect(dd.exists()).toBe(true)
    expect(dd.html()).not.toContain('onclick')
    expect(dd.html()).not.toContain('<script')
    expect(dd.text()).toContain('Krok 1')
  })

  it('klik w przycisk zamknięcia emituje close', async () => {
    const wrapper = mount(TestDetailModal, {
      props: { test: { id: 1, title: 'T', status_id: 1 } },
    })
    await wrapper.find('[data-testid="test-modal-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('klik w tło emituje close, klik w treść modala nie', async () => {
    const wrapper = mount(TestDetailModal, {
      props: { test: { id: 1, title: 'T', status_id: 1 } },
    })

    await wrapper.find('.max-w-lg').trigger('click')
    expect(wrapper.emitted('close')).toBeFalsy()

    await wrapper.find('[data-testid="test-modal-backdrop"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('klawisz Escape emituje close, gdy modal jest otwarty', async () => {
    const wrapper = mount(TestDetailModal, { props: { test: { id: 1, title: 'T', status_id: 1 } } })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
