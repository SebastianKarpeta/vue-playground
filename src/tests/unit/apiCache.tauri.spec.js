import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const isTauriMock = vi.fn()
const testrailRequestMock = vi.fn()

vi.mock('../../composables/tauriApi', () => ({
  isTauri: (...args) => isTauriMock(...args),
  testrailRequest: (...args) => testrailRequestMock(...args),
}))

describe('cachedFetch w trybie Tauri', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    sessionStorage.clear()
    isTauriMock.mockReset()
    testrailRequestMock.mockReset()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gdy isTauri()===true, woła testrailRequest z przetłumaczonym endpointem zamiast fetch()', async () => {
    isTauriMock.mockReturnValue(true)
    testrailRequestMock.mockResolvedValue({ projects: [{ id: 1 }] })

    const { cachedFetch } = await import('../../composables/apiCache')
    const result = await cachedFetch('http://test/api/projects.php')

    expect(testrailRequestMock).toHaveBeenCalledWith('get_projects')
    expect(fetch).not.toHaveBeenCalled()
    expect(result.data).toEqual({ projects: [{ id: 1 }] })
    expect(result.fromCache).toBe(false)
  })

  it('gdy isTauri()===false, dalej używa fetch() (tryb webowy bez zmian)', async () => {
    isTauriMock.mockReturnValue(false)
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })

    const { cachedFetch } = await import('../../composables/apiCache')
    const result = await cachedFetch('http://test/api/projects.php')

    expect(fetch).toHaveBeenCalledWith('http://test/api/projects.php')
    expect(testrailRequestMock).not.toHaveBeenCalled()
    expect(result.data).toEqual({ projects: [] })
  })

  it('błąd z testrailRequest nie trafia do cache — kolejne wywołanie próbuje ponownie', async () => {
    isTauriMock.mockReturnValue(true)
    testrailRequestMock.mockRejectedValueOnce(new Error('Brak zapisanych danych logowania do TestRail'))
    testrailRequestMock.mockResolvedValueOnce({ projects: [] })

    const { cachedFetch } = await import('../../composables/apiCache')

    await expect(cachedFetch('http://test/api/projects.php')).rejects.toThrow(
        'Brak zapisanych danych logowania do TestRail'
    )
    const second = await cachedFetch('http://test/api/projects.php')
    expect(second.data).toEqual({ projects: [] })
    expect(testrailRequestMock).toHaveBeenCalledTimes(2)
  })
})
