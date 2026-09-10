import { describe, it, expect, vi, beforeEach } from 'vitest'

const invokeMock = vi.fn()
const isTauriMock = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args) => invokeMock(...args),
  isTauri: (...args) => isTauriMock(...args),
}))

describe('tauriApi', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    isTauriMock.mockReset()
  })

  it('isTauri() deleguje do @tauri-apps/api/core', async () => {
    isTauriMock.mockReturnValue(true)
    const { isTauri } = await import('../../composables/tauriApi')

    expect(isTauri()).toBe(true)
    expect(isTauriMock).toHaveBeenCalled()
  })

  it('getStoredCredentials woła invoke("get_credentials")', async () => {
    invokeMock.mockResolvedValue({ url: 'https://x', user: 'u', key: 'k' })
    const { getStoredCredentials } = await import('../../composables/tauriApi')

    const result = await getStoredCredentials()

    expect(invokeMock).toHaveBeenCalledWith('get_credentials')
    expect(result).toEqual({ url: 'https://x', user: 'u', key: 'k' })
  })

  it('saveCredentials woła invoke("save_credentials", {url, user, key})', async () => {
    invokeMock.mockResolvedValue(undefined)
    const { saveCredentials } = await import('../../composables/tauriApi')

    await saveCredentials('https://x', 'u', 'k')

    expect(invokeMock).toHaveBeenCalledWith('save_credentials', { url: 'https://x', user: 'u', key: 'k' })
  })

  it('clearCredentials woła invoke("clear_credentials")', async () => {
    invokeMock.mockResolvedValue(undefined)
    const { clearCredentials } = await import('../../composables/tauriApi')

    await clearCredentials()

    expect(invokeMock).toHaveBeenCalledWith('clear_credentials')
  })

  it('testCredentials NIE rzuca przy sukcesie i woła invoke("test_credentials", ...)', async () => {
    invokeMock.mockResolvedValue(undefined)
    const { testCredentials } = await import('../../composables/tauriApi')

    await expect(testCredentials('https://x', 'u', 'k')).resolves.toBeUndefined()
    expect(invokeMock).toHaveBeenCalledWith('test_credentials', { url: 'https://x', user: 'u', key: 'k' })
  })

  it('testCredentials przepakowuje błąd Rusta (string) w Error z tą samą treścią', async () => {
    invokeMock.mockRejectedValue('TestRail zwrócił błąd 401: Authentication failed')
    const { testCredentials } = await import('../../composables/tauriApi')

    await expect(testCredentials('https://x', 'zly@user', 'zlyklucz')).rejects.toThrow(
        'TestRail zwrócił błąd 401: Authentication failed'
    )
  })

  it('testrailRequest zwraca dane przy sukcesie', async () => {
    invokeMock.mockResolvedValue({ projects: [] })
    const { testrailRequest } = await import('../../composables/tauriApi')

    const result = await testrailRequest('get_projects')

    expect(invokeMock).toHaveBeenCalledWith('testrail_request', { endpoint: 'get_projects' })
    expect(result).toEqual({ projects: [] })
  })

  it('testrailRequest przepakowuje błąd Rusta w Error', async () => {
    invokeMock.mockRejectedValue('Brak zapisanych danych logowania do TestRail')
    const { testrailRequest } = await import('../../composables/tauriApi')

    await expect(testrailRequest('get_projects')).rejects.toThrow(
        'Brak zapisanych danych logowania do TestRail'
    )
  })
})
