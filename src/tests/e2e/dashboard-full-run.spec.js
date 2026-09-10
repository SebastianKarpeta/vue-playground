import { test, expect } from '@playwright/test'

// Mały, realny run (3 testy, brak milestone'a) — celowo NIE używamy tu
// głównego fixture'u ("Example project" / "Test Run 21/06/2026", ~8000
// testów), bo pełne ładowanie takiego runu trwa realnie kilkanaście minut.
async function navigateToSmallRun(page) {
  await page.goto('/')
  await page.getByLabel('Projekt').selectOption({ label: '_WS Test' })
  await page.getByLabel('Run').selectOption({ label: 'Test Run 25/05/2026' })
  await expect(page.getByTestId('test-item').first()).toBeVisible({ timeout: 15000 })
}

async function loadFullRun(page) {
  await page.getByTestId('load-full-run').click()
  await expect(page.getByText(/Wczytano cały run/)).toBeVisible({ timeout: 15000 })
}

test('zwykłe "Odśwież" w trybie pełnym NIE przeładowuje całego runu — do tego służy osobny przycisk "Odśwież cały zbiór"', async ({ page }) => {
  await navigateToSmallRun(page)
  await loadFullRun(page)

  const fullDataRequests = []
  page.on('request', (req) => {
    if (req.url().includes('/api/cases.php') || req.url().includes('limit=250')) {
      fullDataRequests.push(req.url())
    }
  })

  // zwykłe "Odśwież" (górne, ogólne) — ma być lekkie, bez ~10-minutowego przeładowania
  await page.getByTestId('refresh-data').click()
  await expect(page.getByText(/Zaktualizowano/)).toBeVisible({ timeout: 15000 })
  expect(fullDataRequests).toEqual([])
  await expect(page.getByText(/Wczytano cały run/)).toBeVisible()

  // dedykowany przycisk faktycznie wymusza pełne, jawne odświeżenie
  await page.getByTestId('refresh-full-run').click()
  await expect.poll(() => fullDataRequests.length, { timeout: 15000 }).toBeGreaterThan(0)
})

test('wyjście z trybu pełnego i ponowne "Załaduj cały run" wraca natychmiast, bez nowych zapytań sieciowych', async ({ page }) => {
  await navigateToSmallRun(page)
  await loadFullRun(page)

  await page.getByTestId('exit-full-run').click()
  await expect(page.getByTestId('load-full-run')).toBeVisible()
  // etykieta ma odzwierciedlać, że wróci z pamięci, a nie odpyta sieć od nowa
  await expect(page.getByTestId('load-full-run')).toHaveText(/Wróć do trybu pełnego/)

  const dataRequests = []
  page.on('request', (req) => {
    if (req.url().includes('/api/tests.php') || req.url().includes('/api/cases.php')) {
      dataRequests.push(req.url())
    }
  })

  await page.getByTestId('load-full-run').click()
  await expect(page.getByText(/Wczytano cały run/)).toBeVisible({ timeout: 15000 })

  // snapshot w sessionStorage powinien wystarczyć — zero nowych zapytań
  // do tests.php/cases.php (regresja: @click="loadFullDataset" bez
  // nawiasów przekazywał natywny MouseEvent jako `force`, co zawsze
  // wymuszało pełne, ponowne pobranie z sieci)
  expect(dataRequests).toEqual([])
})

test('po wyjściu z trybu pełnego kliknięcie "Dalej" NIE przywraca numerowanej paginacji', async ({ page }) => {
  await navigateToSmallRun(page)

  // limit=2 wymusza więcej niż jedną stronę na tylko 3 testach w tym runie
  const smallPageUrl = new URL(page.url())
  smallPageUrl.searchParams.set('limit', '2')
  await page.goto(smallPageUrl.toString())
  await expect(page.getByTestId('test-item').first()).toBeVisible({ timeout: 15000 })

  await loadFullRun(page)
  await page.getByTestId('exit-full-run').click()
  await expect(page.getByTestId('load-full-run')).toBeVisible()

  await expect(page.getByTestId('tests-next')).toBeEnabled({ timeout: 15000 })
  await page.getByTestId('tests-next').click()

  // zwykłe Wstecz/Dalej, NIE numerowana paginacja trybu pełnego
  await expect(page.getByTestId('tests-prev')).toBeVisible()
  await expect(page.getByTestId('tests-page-1')).toHaveCount(0)
  await expect(page.getByText(/Wczytano cały run/)).toHaveCount(0)
})

test('w trakcie ładowania całego runu: WSZYSTKIE interaktywne elementy (paginacja, sortowanie, filtr daty, rozmiar strony, filtry statusów, wyszukiwanie, klik w wiersz) są zablokowane', async ({ page }) => {
  await navigateToSmallRun(page)

  // sztucznie spowolnij te zapytania, żeby mieć okno na sprawdzenie stanu w trakcie ładowania
  await page.route('**/api/tests.php**', async (route) => {
    await new Promise((r) => setTimeout(r, 2500))
    await route.continue()
  })
  await page.route('**/api/cases.php**', async (route) => {
    await new Promise((r) => setTimeout(r, 2500))
    await route.continue()
  })

  await page.getByTestId('load-full-run').click()
  await expect(page.getByTestId('full-run-spinner')).toBeVisible()

  await expect(page.getByTestId('tests-next')).toBeDisabled()
  await expect(page.getByTestId('tests-prev')).toBeDisabled()
  await expect(page.getByTestId('sort-created')).toBeDisabled()
  await expect(page.getByTestId('sort-modified')).toBeDisabled()
  await expect(page.getByTestId('filter-date-field-created')).toBeDisabled()
  await expect(page.getByTestId('filter-date-from')).toBeDisabled()
  await expect(page.getByTestId('tests-page-size')).toBeDisabled()
  await expect(page.getByTestId('filter-passed')).toBeDisabled()
  await expect(page.getByTestId('filter-failed')).toBeDisabled()
  await expect(page.getByTestId('tests-search')).toBeDisabled()

  // klik w wiersz podczas ładowania nic nie robi — modal się nie otwiera
  await page.getByTestId('test-item').first().click()
  await expect(page.getByTestId('test-modal-backdrop')).toHaveCount(0)

  await expect(page.getByText(/Wczytano cały run/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('tests-search')).toBeEnabled()

  // po zakończeniu ładowania klik w wiersz znów działa
  await page.getByTestId('test-item').first().click()
  await expect(page.getByTestId('test-modal-backdrop')).toBeVisible()
})

test('kliknięcie testu na stronie > 1 w trybie pełnym otwiera modal z jego szczegółami (regresja: openTest szukał tylko w małej stronie serwerowej)', async ({ page }) => {
  await navigateToSmallRun(page)

  // limit=1 wymusza 3 strony na tylko 3 testach w tym runie
  const smallPageUrl = new URL(page.url())
  smallPageUrl.searchParams.set('limit', '1')
  await page.goto(smallPageUrl.toString())
  await expect(page.getByTestId('test-item').first()).toBeVisible({ timeout: 15000 })

  await loadFullRun(page)
  await page.getByTestId('tests-page-3').click()

  const titleOnPage3 = await page.getByTestId('test-item').first().locator('td').first().textContent()
  await page.getByTestId('test-item').first().click()

  await expect(page.getByTestId('test-modal-backdrop')).toBeVisible()
  await expect(page.getByTestId('test-modal-backdrop')).toContainText(titleOnPage3.trim())
})
