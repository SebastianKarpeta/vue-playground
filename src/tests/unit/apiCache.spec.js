import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cachedFetch } from '../../composables/apiCache'

describe('cachedFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockOkResponse(payload) {
    return { ok: true, json: async () => payload }
  }

  it('odpytuje sieć przy pierwszym wywołaniu i zapisuje wynik w cache', async () => {
    const url = 'http://test/api/a?x=1'
    fetch.mockResolvedValueOnce(mockOkResponse({ foo: 'bar' }))

    const result = await cachedFetch(url)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual({ foo: 'bar' })
    expect(result.fromCache).toBe(false)
  })

  it('przy kolejnym wywołaniu tego samego URL-a nie odpytuje sieci ponownie', async () => {
    const url = 'http://test/api/b?x=1'
    fetch.mockResolvedValueOnce(mockOkResponse({ foo: 'bar' }))

    await cachedFetch(url)
    const second = await cachedFetch(url)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(second.fromCache).toBe(true)
    expect(second.data).toEqual({ foo: 'bar' })
  })

  it('force:true wymusza nowe zapytanie mimo cache', async () => {
    const url = 'http://test/api/c?x=1'
    fetch.mockResolvedValueOnce(mockOkResponse({ v: 1 }))
    fetch.mockResolvedValueOnce(mockOkResponse({ v: 2 }))

    await cachedFetch(url)
    const refreshed = await cachedFetch(url, { force: true })

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(refreshed.fromCache).toBe(false)
    expect(refreshed.data).toEqual({ v: 2 })
  })

  it('różne URL-e (np. inna strona paginacji) mają osobne wpisy w cache', async () => {
    fetch.mockResolvedValueOnce(mockOkResponse({ page: 1 }))
    fetch.mockResolvedValueOnce(mockOkResponse({ page: 2 }))

    const first = await cachedFetch('http://test/api/tests?offset=0')
    const secondPage = await cachedFetch('http://test/api/tests?offset=20')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(first.data).toEqual({ page: 1 })
    expect(secondPage.data).toEqual({ page: 2 })
  })

  it('równoległe wywołania tego samego URL-a przed zakończeniem pierwszego dzielą jedno zapytanie', async () => {
    const url = 'http://test/api/results?test_id=1'
    let resolveFetch
    fetch.mockImplementationOnce(() => new Promise((resolve) => { resolveFetch = resolve }))

    const call1 = cachedFetch(url)
    const call2 = cachedFetch(url)
    const call3 = cachedFetch(url)

    resolveFetch(mockOkResponse({ results: [1, 2, 3] }))
    const [r1, r2, r3] = await Promise.all([call1, call2, call3])

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(r1.data).toEqual({ results: [1, 2, 3] })
    expect(r2.data).toEqual({ results: [1, 2, 3] })
    expect(r3.data).toEqual({ results: [1, 2, 3] })
  })

  it('przeżywa "odświeżenie strony" dzięki sessionStorage (reset stanu w pamięci)', async () => {
    const url = 'http://test/api/e?x=1'
    fetch.mockResolvedValueOnce(mockOkResponse({ persisted: true }))

    const before = await import('../../composables/apiCache')
    await before.cachedFetch(url)

    // symulacja F5: świeży moduł = pusty cache w pamięci, ale sessionStorage zostaje
    vi.resetModules()
    const after = await import('../../composables/apiCache')
    const result = await after.cachedFetch(url)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.fromCache).toBe(true)
    expect(result.data).toEqual({ persisted: true })
  })

  it('skipPersist:true nie zapisuje do sessionStorage, ale dalej dzieli zapytania w pamięci (F5 już nie odtwarza)', async () => {
    const url = 'http://test/api/f?x=1'
    fetch.mockResolvedValueOnce(mockOkResponse({ big: 'payload' }))

    const before = await import('../../composables/apiCache')
    const result = await before.cachedFetch(url, { skipPersist: true })
    expect(result.fromCache).toBe(false)

    // w tej samej "karcie" (moduł nie zresetowany) wciąż korzysta z cache w pamięci
    const second = await before.cachedFetch(url, { skipPersist: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(second.fromCache).toBe(true)

    // ale nic nie trafiło do sessionStorage — symulacja F5 (świeży moduł) musi odpytać sieć ponownie
    fetch.mockResolvedValueOnce(mockOkResponse({ big: 'payload' }))
    vi.resetModules()
    const after = await import('../../composables/apiCache')
    const afterReload = await after.cachedFetch(url)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(afterReload.fromCache).toBe(false)
  })

  it('rzuca błąd i nie cache’uje odpowiedzi, gdy serwer zwróci błąd', async () => {
    const url = 'http://test/api/d?x=1'
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

    await expect(cachedFetch(url)).rejects.toThrow('500')

    fetch.mockResolvedValueOnce(mockOkResponse({ ok: 'now' }))
    const retry = await cachedFetch(url)
    expect(retry.fromCache).toBe(false)
    expect(retry.data).toEqual({ ok: 'now' })
  })
})
