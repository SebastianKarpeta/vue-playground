import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TestRailSetup from '../../components/TestRailSetup.vue'

const testCredentialsMock = vi.fn()
const saveCredentialsMock = vi.fn()

vi.mock('../../composables/tauriApi', () => ({
  testCredentials: (...args) => testCredentialsMock(...args),
  saveCredentials: (...args) => saveCredentialsMock(...args),
}))

async function fillAndSubmit(wrapper, { url = 'https://x.testrail.io', user = 'a@b.pl', key = 'klucz' } = {}) {
  await wrapper.find('[data-testid="setup-url"]').setValue(url)
  await wrapper.find('[data-testid="setup-user"]').setValue(user)
  await wrapper.find('[data-testid="setup-key"]').setValue(key)
  await wrapper.find('form').trigger('submit.prevent')
  await flushMicrotasks()
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('TestRailSetup', () => {
  beforeEach(() => {
    testCredentialsMock.mockReset()
    saveCredentialsMock.mockReset()
  })

  it('przy sukcesie: sprawdza dane, DOPIERO POTEM je zapisuje, i emituje connected', async () => {
    const callOrder = []
    testCredentialsMock.mockImplementation(async () => { callOrder.push('test') })
    saveCredentialsMock.mockImplementation(async () => { callOrder.push('save') })

    const wrapper = mount(TestRailSetup)
    await fillAndSubmit(wrapper)

    expect(callOrder).toEqual(['test', 'save'])
    expect(wrapper.emitted('connected')).toBeTruthy()
    expect(wrapper.find('[data-testid="setup-error"]').exists()).toBe(false)
  })

  // Regresja: wcześniej saveCredentials leciało PRZED walidacją, więc błędne
  // dane i tak trafiały na dysk jako "skonfigurowane" — ekran logowania już
  // by się drugi raz nie pojawił, mimo że nic nie działało.
  it('przy błędnych danych: NIE zapisuje ich, pokazuje błąd, nie emituje connected', async () => {
    testCredentialsMock.mockRejectedValue(new Error('TestRail zwrócił błąd 401: Authentication failed'))

    const wrapper = mount(TestRailSetup)
    await fillAndSubmit(wrapper, { user: 'zly@user.pl' })

    expect(saveCredentialsMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('connected')).toBeFalsy()
    expect(wrapper.find('[data-testid="setup-error"]').text()).toContain('Authentication failed')
  })

  it('podczas sprawdzania przycisk jest zablokowany i pokazuje "Łączenie…"', async () => {
    let resolveTest
    testCredentialsMock.mockImplementation(() => new Promise((r) => { resolveTest = r }))

    const wrapper = mount(TestRailSetup)
    await wrapper.find('[data-testid="setup-url"]').setValue('https://x.testrail.io')
    await wrapper.find('[data-testid="setup-user"]').setValue('a@b.pl')
    await wrapper.find('[data-testid="setup-key"]').setValue('klucz')
    await wrapper.find('form').trigger('submit.prevent')

    const button = wrapper.find('[data-testid="setup-connect"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('Łączenie')

    resolveTest()
    await flushMicrotasks()
  })
})
