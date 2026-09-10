import { isTauri, testrailRequest } from './tauriApi'
import { urlToEndpoint } from './testrailEndpoint'

// Cache zapytań do API, keyowany pełnym URL-em.
//
// Dwie warstwy:
// 1. `memoryCache` (Promise, nie gotowy wynik) — żyje tylko w ramach jednego
//    załadowania strony. Dzięki trzymaniu Promise'a, a nie wyniku, wiele
//    równoległych wywołań tego samego URL-a (np. 20 zapytań o liczbę
//    wyników, odpalanych bez await między nimi) współdzieli jedno
//    zapytanie sieciowe zamiast każde osobno widzieć "jeszcze pusty" cache.
// 2. `sessionStorage` — przeżywa prawdziwe odświeżenie strony (F5), znika
//    dopiero gdy zamkniesz kartę/przeglądarkę.
const memoryCache = new Map()

function storageKey(url) {
  return `vue_playground_cache:${url}`
}

function readPersisted(url) {
  try {
    const raw = sessionStorage.getItem(storageKey(url))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writePersisted(url, entry) {
  try {
    sessionStorage.setItem(storageKey(url), JSON.stringify(entry))
  } catch {
    // np. przekroczony limit sessionStorage — cache w pamięci nadal działa,
    // po prostu nie przeżyje odświeżenia strony
  }
}

// `skipPersist` — dla zapytań w pętli masowego ładowania (np. wszystkie
// strony get_tests/get_cases dla całego runu): te strony niosą bogaty HTML
// w polach custom_* i potrafią same w sobie zająć kilkanaście-kilkadziesiąt
// MB w sessionStorage, zapychając limit na długo zanim dojdzie do zapisu
// czegokolwiek ważniejszego (np. finalnego, okrojonego snapshotu). Dalej
// dzielą jedno zapytanie sieciowe w ramach tej samej karty (memoryCache),
// po prostu nie przeżywają F5.
export async function cachedFetch(url, { force = false, skipPersist = false } = {}) {
  if (!force) {
    if (memoryCache.has(url)) {
      const entry = await memoryCache.get(url)
      return { ...entry, fromCache: true }
    }

    const persisted = readPersisted(url)
    if (persisted) {
      memoryCache.set(url, Promise.resolve(persisted))
      return { ...persisted, fromCache: true }
    }
  }

  const promise = (async () => {
    // W wersji desktopowej (Tauri) nie ma PHP proxy — endpoint idzie
    // bezpośrednio z Rusta do TestRail, po URL-u tylko rozpoznajemy, o co
    // pytamy (patrz testrailEndpoint.js), reszta cache'owania jest wspólna.
    const data = isTauri()
        ? await testrailRequest(urlToEndpoint(url))
        : await (async () => {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`TestRail zwrócił błąd: ${res.status}`)
          return res.json()
        })()
    const entry = { data, timestamp: Date.now() }
    if (!skipPersist) writePersisted(url, entry)
    return entry
  })()

  memoryCache.set(url, promise)

  try {
    const entry = await promise
    return { ...entry, fromCache: false }
  } catch (e) {
    memoryCache.delete(url)
    throw e
  }
}
