import { test, expect } from '@playwright/test'

test('nawigacja projekt -> milestone -> runy', async ({ page }) => {
  await page.goto('/')

  const projects = page.getByTestId('project-item')
  await expect(projects.first()).toBeVisible()

  await projects.filter({ hasText: 'Example project' }).click()

  const milestones = page.getByTestId('milestone-item')
  await expect(milestones.first()).toBeVisible()

  await milestones.filter({ hasText: 'Release 1.0' }).click()

  const runs = page.getByTestId('run-item')
  await expect(runs.first()).toBeVisible()

  expect(page.url()).toContain('/vue/project/')
  expect(page.url()).toContain('/milestone/')
})
