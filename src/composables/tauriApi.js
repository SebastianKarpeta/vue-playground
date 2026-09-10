// Cienka warstwa nad @tauri-apps/api — reszta apki nie musi wiedzieć, czy
// działa jako strona w przeglądarce (PHP proxy) czy jako appka Tauri
// (Rust proxy), poza tym jednym punktem.
import { isTauri as checkIsTauri, invoke } from '@tauri-apps/api/core'

export function isTauri() {
  return checkIsTauri()
}

export function getStoredCredentials() {
  return invoke('get_credentials')
}

export function saveCredentials(url, user, key) {
  return invoke('save_credentials', { url, user, key })
}

// Sprawdza dane logowania na żywo, BEZ zapisywania ich — wołane przed
// saveCredentials, żeby błędne dane nigdy nie trafiły na dysk jako rzekomo
// "skonfigurowane" (inaczej ekran logowania już by się nie pojawił).
export async function testCredentials(url, user, key) {
  try {
    await invoke('test_credentials', { url, user, key })
  } catch (err) {
    throw new Error(typeof err === 'string' ? err : 'TestRail zwrócił błąd')
  }
}

export function clearCredentials() {
  return invoke('clear_credentials')
}

export async function testrailRequest(endpoint) {
  try {
    return await invoke('testrail_request', { endpoint })
  } catch (err) {
    throw new Error(typeof err === 'string' ? err : 'TestRail zwrócił błąd')
  }
}
