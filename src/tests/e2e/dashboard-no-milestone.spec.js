import { test, expect } from '@playwright/test'

test('projekt bez milestone\'ów odblokowuje Run bezpośrednio, Milestone zostaje zablokowany', async ({ page }) => {
  await page.goto('/')

  const projectSelect = page.getByLabel('Projekt')
  const milestoneSelect = page.getByLabel('Milestone')
  const runSelect = page.getByLabel('Run')

  // "Assembla" (id=4) w tym demo-koncie TestRaila nie ma żadnych milestone'ów
  await projectSelect.selectOption({ label: 'Assembla' })

  await expect(milestoneSelect).toBeDisabled()
  await expect(runSelect).toBeEnabled()
})
