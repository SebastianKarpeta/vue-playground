import { test, expect } from '@playwright/test'

async function navigateToRun(page) {
  await page.goto('/')
  await page.getByLabel('Projekt').selectOption({ label: 'Example project' })
  await page.getByLabel('Milestone').selectOption({ label: 'Release 1.0' })
  await page.getByLabel('Run').selectOption({ label: 'Test Run 21/06/2026' })
  await expect(page.getByTestId('test-item').first()).toBeVisible()
}

test('filtr statusu zawęża listę do jednego statusu i czyści się przyciskiem', async ({ page }) => {
  await navigateToRun(page)

  await page.getByTestId('filter-blocked').click()

  const items = page.getByTestId('test-item')
  // realne API TestRaila, nie mock — daj mu czas zamiast domyślnych 5s
  await expect(items).toHaveCount(1, { timeout: 15000 })
  await expect(items.first()).toContainText('Blocked')

  await page.getByTestId('filter-clear').click()
  await expect(items.first()).toBeVisible({ timeout: 15000 })
  expect(await items.count()).toBeGreaterThan(1)
})

test('wyszukiwarka filtruje testy na bieżącej stronie po nazwie', async ({ page }) => {
  await navigateToRun(page)

  const beforeCount = await page.getByTestId('test-item').count()
  expect(beforeCount).toBeGreaterThan(1)

  await page.getByTestId('tests-search').fill('Belgae')

  const items = page.getByTestId('test-item')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('Belgae')
})

test('paginacja przeżywa odświeżenie strony (offset w URL)', async ({ page }) => {
  await navigateToRun(page)

  const firstPageTitle = await page.getByTestId('test-item').first().textContent()

  await page.getByTestId('tests-next').click()
  await expect(page).toHaveURL(/offset=20/)
  // upewnij się, że dane strony 2 naprawdę doszły (i trafiły do cache),
  // zanim odświeżymy — inaczej to wyścig z jeszcze trwającym zapytaniem
  await expect(page.getByTestId('test-item').first()).toBeVisible({ timeout: 15000 })

  await page.reload()
  await expect(page).toHaveURL(/offset=20/)
  await expect(page.getByTestId('test-item').first()).toBeVisible({ timeout: 15000 })

  const secondPageTitleAfterReload = await page.getByTestId('test-item').first().textContent()
  expect(secondPageTitleAfterReload).not.toBe(firstPageTitle)
})

test('przycisk Odśwież wymusza nowe zapytania do API (pomija cache)', async ({ page }) => {
  await navigateToRun(page)

  const responsePromise = page.waitForResponse((res) => res.url().includes('/api/projects.php'))
  await page.getByTestId('refresh-data').click()
  const response = await responsePromise

  expect(response.status()).toBe(200)
})
