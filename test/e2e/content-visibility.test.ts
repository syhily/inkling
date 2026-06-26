import { expect, test } from '@playwright/test'

import { focusEditor, initialize, insertCard } from '#/utils/e2e'

test.describe('Content Visibility', async () => {
  let page
  async function insertHtmlCard() {
    await focusEditor(page)
    await insertCard(page, { cardName: 'html' })
    await expect(page.locator('.cm-content[contenteditable="true"]')).toBeVisible()
    await page.keyboard.type('Testing')
    // exit editing mode - use Escape instead of Meta+Enter for cross-platform compatibility
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-inkling-card="html"]')).toHaveAttribute('data-inkling-card-editing', 'false')
    await expect(page.locator('[data-inkling-card="html"]')).toHaveAttribute('data-inkling-card-selected', 'true')
    return page.locator('[data-inkling-card="html"]')
  }
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.describe('HTML card', async function () {
    test.beforeEach(async () => {
      await initialize({ page, uri: '/#/?content=false' })
    })

    test('toolbar shows edit icon', async function () {
      await insertHtmlCard()

      await expect(page.locator('[data-inkling-card="html"]')).toHaveAttribute('data-inkling-card-selected', 'true')
      await expect(page.locator('[data-inkling-card="html"]')).toHaveAttribute('data-inkling-card-editing', 'false')
      await expect(page.locator('[data-inkling-card-toolbar="html"]')).toBeVisible()
      await expect(page.locator('[data-inkling-card-toolbar="html"] [data-testid="edit-html"]')).toBeVisible()
    })

    test('toolbar does not show settings panel by default on click', async function () {
      const card = await insertHtmlCard()
      await card.getByTestId('edit-html').click()
      await expect(card.getByTestId('settings-panel')).not.toBeVisible()
    })

    test('clicking on edit button transitions card into edit mode', async function () {
      const card = await insertHtmlCard()
      await card.getByTestId('edit-html').click()

      await expect(card).toHaveAttribute('data-inkling-card-editing', 'true')
    })

    test('visibility settings defaults to show on email and web and all members', async function () {
      const card = await insertHtmlCard()

      await card.getByTestId('show-visibility').click()
      await card.getByTestId('tab-visibility').click()

      await expect(card.getByTestId('visibility-message')).not.toBeVisible()

      await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeChecked()
      await expect(card.getByTestId('visibility-toggle-web-freeMembers')).toBeChecked()
      await expect(card.getByTestId('visibility-toggle-web-paidMembers')).toBeChecked()
      await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked()
      await expect(card.getByTestId('visibility-toggle-email-paidMembers')).toBeChecked()
    })

    test('can toggle visibility settings ', async function () {
      const card = await insertHtmlCard()

      await card.getByTestId('show-visibility').click()
      await card.getByTestId('tab-visibility').click()

      await card.getByTestId('visibility-toggle-web-nonMembers').click()
      await expect(card.getByTestId('visibility-toggle-web-nonMembers')).not.toBeChecked()
      await card.getByTestId('visibility-toggle-web-freeMembers').click()
      await expect(card.getByTestId('visibility-toggle-web-freeMembers')).not.toBeChecked()
      await card.getByTestId('visibility-toggle-web-paidMembers').click()
      await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeChecked()
      await card.getByTestId('visibility-toggle-email-freeMembers').click()
      await expect(card.getByTestId('visibility-toggle-email-freeMembers')).not.toBeChecked()
      await card.getByTestId('visibility-toggle-email-paidMembers').click()
      await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeChecked()

      // change from the beta - visibility message is no longer shown
      await expect(card.getByTestId('visibility-message')).not.toBeVisible()
    })

    test('toggling settings in visibility panel does not trigger edit mode', async function () {
      const card = await insertHtmlCard()

      await card.getByTestId('show-visibility').click()
      await card.getByTestId('tab-visibility').click()
      await card.getByTestId('visibility-toggle-web-nonMembers').click()
      await expect(card).toHaveAttribute('data-inkling-card-editing', 'false')
    })

    test('visibility icon is shown when visibility changes from shown-to-all', async function () {
      const card = await insertHtmlCard()

      await expect(page.getByTestId('visibility-indicator')).not.toBeVisible()

      await card.getByTestId('show-visibility').click()
      await card.getByTestId('tab-visibility').click()
      await expect(card).toHaveAttribute('data-inkling-card-editing', 'false')
      await card.getByTestId('visibility-toggle-web-nonMembers').click()

      await expect(page.getByTestId('visibility-indicator')).toBeVisible()
    })

    test('paid member visibility settings hidden when stripe is not enabled', async function () {
      await initialize({ page, uri: '/#/?content=false&stripe=false' })
      const card = await insertHtmlCard()

      await card.getByTestId('show-visibility').click()
      await card.getByTestId('tab-visibility').click()

      await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeVisible()
      await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeVisible()
    })

    test('visibility indicator can toggle visibility settings panel', async function () {
      const card = await insertHtmlCard()

      await card.getByTestId('show-visibility').click()
      await card.getByTestId('tab-visibility').click()

      await card.getByTestId('visibility-toggle-web-nonMembers').click()

      // click on the left side of the title to avoid the card toolbar which overlaps the title center
      await page.getByTestId('post-title').click({ position: { x: 10, y: 20 } })
      await page.getByTestId('visibility-indicator').click()

      await expect(card.getByTestId('settings-panel')).toBeVisible()
    })

    test('clicking show visibility in toolbar does not trigger edit mode', async function () {
      const card = await insertHtmlCard()

      await page.getByTestId('show-visibility').click()
      await expect(card).toHaveAttribute('data-inkling-card-editing', 'false')
    })

    test('clicking visibility indicator does not trigger edit mode', async function () {
      const card = await insertHtmlCard()

      await card.getByTestId('show-visibility').click()
      await card.getByTestId('tab-visibility').click()

      await card.getByTestId('visibility-toggle-web-nonMembers').click()

      // click on the left side of the title to avoid the card toolbar which overlaps the title center
      await page.getByTestId('post-title').click({ position: { x: 10, y: 20 } })

      await page.getByTestId('visibility-indicator').click()
      await expect(card).toHaveAttribute('data-inkling-card-editing', 'false')
    })
  })
})
