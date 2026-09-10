import { test, expect } from '@playwright/test'

test('nawigacja projekt -> milestone -> run -> test przez selecty', async ({ page }) => {
  await page.goto('/')

  const projectSelect = page.getByLabel('Projekt')
  const milestoneSelect = page.getByLabel('Milestone')
  const runSelect = page.getByLabel('Run')

  await expect(milestoneSelect).toBeDisabled()
  await expect(runSelect).toBeDisabled()

  await projectSelect.selectOption({ label: 'Example project' })

  await expect(milestoneSelect).toBeEnabled()
  await expect(runSelect).toBeDisabled()

  await milestoneSelect.selectOption({ label: 'Release 1.0' })

  await expect(runSelect).toBeEnabled()
  expect(page.url()).toContain('/milestone/')

  await runSelect.selectOption({ label: 'Test Run 21/06/2026' })

  const tests = page.getByTestId('test-item')
  await expect(tests.first()).toBeVisible()
  expect(page.url()).toContain('/run/')

  await tests.first().click()

  await expect(page.getByTestId('test-modal-backdrop')).toBeVisible()

  await page.getByTestId('test-modal-close').click()
  await expect(page.getByTestId('test-modal-backdrop')).not.toBeVisible()
})
