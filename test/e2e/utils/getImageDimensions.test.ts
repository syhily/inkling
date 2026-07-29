import { expect, test, type Page } from '@playwright/test'

import { fixture, focusEditor, initialize, insertCard } from '#/utils/e2e'
import { awaitMediaEvents, MEDIA_LOAD_TIMEOUT_MS } from '@/utils/awaitMediaEvents'
import { getImageDimensions } from '@/utils/getImageDimensions'

test.describe('Image card', () => {
  let page: Page
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.beforeEach(async () => {
    await initialize({ page })
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('can get image height and width', async function () {
    const filePath = fixture('large-image.png')

    await focusEditor(page)
    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), insertCard(page, { cardName: 'image' })])
    await fileChooser.setFiles([filePath])

    const imageCard = page.locator('[data-inkling-card="image"]')
    expect(imageCard).not.toBeNull()

    const image = page.locator('img')
    expect(image).not.toBeNull()

    const url = await image.getAttribute('src')

    // getImageDimensions delegates to awaitMediaEvents, so the page-side
    // evaluation inlines the primitive and its default-timeout constant first
    const command = `(() => {
      const MEDIA_LOAD_TIMEOUT_MS = ${MEDIA_LOAD_TIMEOUT_MS}
      const awaitMediaEvents = ${awaitMediaEvents.toString()}
      return (${getImageDimensions.toString()})('${url}')
    })()`
    const dimensions = await page.evaluate(command)

    expect(dimensions).toEqual({ width: 248, height: 248 })
  })
})
