import { expect, test } from '@playwright/test'

import { assertHTML, createSnippet, focusEditor, html, initialize, insertCard, isMac } from '#/utils/e2e'

test.describe('Bookmark card', async () => {
  const ctrlOrCmd = isMac() ? 'Meta' : 'Control'
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.beforeEach(async () => {
    await initialize({ page, uri: '/#/?content=false&searchLinks=false' })
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('can import serialized bookmark card nodes', async function () {
    const contentParam = encodeURIComponent(
      JSON.stringify({
        root: {
          children: [
            {
              type: 'bookmark',
              url: 'https://inkling.local/',
              caption: 'caption here',
              metadata: {
                icon: 'https://inkling.local/favicon.ico',
                title: 'Inkling: The Creator Economy Platform',
                description: 'lorem ipsum dolor amet lorem ipsum dolor amet',
                author: 'inkling',
                publisher: 'Inkling - The Professional Publishing Platform',
                thumbnail: 'https://inkling.local/images/meta/inkling.png',
              },
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      }),
    )

    await initialize({ page, uri: `/#/?content=${contentParam}` })

    await assertHTML(
      page,
      html`
        <div data-lexical-decorator="true" contenteditable="false">
          <div data-inkling-card-editing="false" data-inkling-card-selected="false" data-inkling-card="bookmark">
            <div>
              <div>
                <div>
                  <div>Inkling: The Creator Economy Platform</div>
                  <div>lorem ipsum dolor amet lorem ipsum dolor amet</div>
                  <div>
                    <img alt="" src="https://inkling.local/favicon.ico" />
                    <span>Inkling - The Professional Publishing Platform</span>
                    <span>inkling</span>
                  </div>
                </div>
                <div><img alt="" src="https://inkling.local/images/meta/inkling.png" /></div>
                <div></div>
              </div>
              <figcaption>
                <div data-inkling-allow-clickthrough="true">
                  <div>
                    <div data-inkling="editor">
                      <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
                        <p dir="ltr">
                          <span data-lexical-text="true">caption here</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </figcaption>
            </div>
          </div>
        </div>
      `,
      { ignoreCardToolbarContents: true, ignoreInnerSVG: true },
    )
  })

  test('renders bookmark card node', async function () {
    await focusEditor(page)
    await insertCard(page, { cardName: 'bookmark' })

    await assertHTML(
      page,
      html`
        <div data-lexical-decorator="true" contenteditable="false">
          <div data-inkling-card-editing="false" data-inkling-card-selected="true" data-inkling-card="bookmark"></div>
        </div>
        <p><br /></p>
      `,
      { ignoreCardContents: true },
    )
  })

  test('can interact with url input after inserting', async function () {
    await focusEditor(page)
    await insertCard(page, { cardName: 'bookmark' })

    const urlInput = await page.getByTestId('bookmark-url')
    await expect(urlInput).toHaveAttribute('placeholder', 'Paste URL to add bookmark content...')

    await urlInput.fill('test')
    await expect(urlInput).toHaveValue('test')
  })

  test.describe('Valid URL handling', async () => {
    test('shows loading wheel', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = await page.getByTestId('bookmark-url')
      await urlInput.fill('https://inkling.local/')
      await urlInput.press('Enter')

      await expect(await page.getByTestId('bookmark-url-loading-container')).toBeVisible()
      await expect(await page.getByTestId('bookmark-url-loading-spinner')).toBeVisible()
    })

    test('displays expected metadata', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = await page.getByTestId('bookmark-url')
      await urlInput.fill('https://inkling.local/')
      await urlInput.press('Enter')

      await expect(await page.getByTestId('bookmark-title')).toHaveText('Inkling: The Creator Economy Platform')
      await expect(await page.getByTestId('bookmark-description')).toContainText(
        'The former of the two songs addresses the issue of negative rumors in a relationship, while the latter, with a more upbeat pulse, is a classic club track; the single is highlighted by a hyped bridge.',
      )
      await expect(await page.getByTestId('bookmark-publisher')).toContainText(
        'Inkling - The Professional Publishing Platform',
      )
    })

    // TODO: the caption editor is very nested, and we don't have an actual input field here, so we aren't testing for filling it
    test('caption displays on insert', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = await page.getByTestId('bookmark-url')
      await urlInput.fill('https://inkling.local/')
      await urlInput.press('Enter')

      const captionInput = await page.getByTestId('bookmark-caption')
      await expect(captionInput).toContainText('Type caption for bookmark (optional)')
    })
  })

  test.describe('Error Handling', async () => {
    test('bad url entry shows error message', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = await page.getByTestId('bookmark-url')
      await urlInput.fill('badurl')
      await expect(urlInput).toHaveValue('badurl')
      await urlInput.press('Enter')

      await expect(await page.getByTestId('bookmark-url-error-message')).toContainText("Oops, that link didn't work.")
    })

    test('retry button bring back url input', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = await page.getByTestId('bookmark-url')
      await expect(urlInput).toHaveAttribute('placeholder', 'Paste URL to add bookmark content...')

      await urlInput.fill('badurl')
      await expect(urlInput).toHaveValue('badurl')
      await urlInput.press('Enter')

      const retryButton = await page.getByTestId('bookmark-url-error-retry')
      await retryButton.click()

      const urlInputRetry = await page.getByTestId('bookmark-url')
      await expect(urlInputRetry).toHaveValue('badurl')
      await expect(retryButton).not.toBeVisible()
    })

    // todo: test is failing, need to figure if the error in test logic or on code
    test.skip('paste as link button removes card and inserts text node link', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = await page.getByTestId('bookmark-url')
      await expect(urlInput).toHaveAttribute('placeholder', 'Paste URL to add bookmark content...')

      await urlInput.fill('badurl')
      await expect(urlInput).toHaveValue('badurl')
      await urlInput.press('Enter')

      const retryButton = await page.getByTestId('bookmark-url-error-pasteAsLink')
      await retryButton.click()

      await assertHTML(
        page,
        html`
          <p>
            <a href="badurl" dir="ltr"><span data-lexical-text="true">badurl</span></a>
          </p>
          <p><br /></p>
        `,
      )
    })

    test('close button removes card', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = await page.getByTestId('bookmark-url')
      await expect(urlInput).toHaveAttribute('placeholder', 'Paste URL to add bookmark content...')

      await urlInput.fill('badurl')
      await expect(urlInput).toHaveValue('badurl')
      await urlInput.press('Enter')

      const retryButton = await page.getByTestId('bookmark-url-error-close')
      await retryButton.click()

      await assertHTML(page, html`<p><br /></p>`)
    })
  })

  test('can add snippet', async function () {
    await focusEditor(page)
    await insertCard(page, { cardName: 'bookmark' })

    const urlInput = await page.getByTestId('bookmark-url')
    await urlInput.fill('https://inkling.local/')
    await urlInput.press('Enter')
    await expect(await page.getByTestId('bookmark-description')).toBeVisible()

    // create snippet
    await page.keyboard.press('Escape')
    await createSnippet(page)

    // can insert card from snippet
    await page.keyboard.press('Enter')
    await page.keyboard.type('/snippet')
    await expect(page.locator('[data-inkling-cardmenu-selected="true"]').filter({ hasText: 'snippet' })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(await page.locator('[data-inkling-card="bookmark"]')).toHaveCount(2)
  })

  test('can undo/redo without losing caption', async function () {
    await focusEditor(page)
    await insertCard(page, { cardName: 'bookmark' })

    const urlInput = await page.getByTestId('bookmark-url')
    await urlInput.fill('https://inkling.local/')
    await urlInput.press('Enter')
    await expect(await page.getByTestId('bookmark-description')).toBeVisible()

    await page.click('[data-testid="bookmark-caption"]')
    await page.keyboard.type('My test caption')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Backspace')
    await page.keyboard.press(`${ctrlOrCmd}+z`)

    await assertHTML(
      page,
      html`
        <div data-lexical-decorator="true" contenteditable="false">
          <div data-inkling-card-editing="false" data-inkling-card-selected="true" data-inkling-card="bookmark">
            <div>
              <div>
                <div>
                  <div>Inkling: The Creator Economy Platform</div>
                  <div>
                    The former of the two songs addresses the issue of negative rumors in a relationship, while the
                    latter, with a more upbeat pulse, is a classic club track; the single is highlighted by a hyped
                    bridge.
                  </div>
                  <div>
                    <img alt="" src="https://inkling.local/favicon.ico" />
                    <span>Inkling - The Professional Publishing Platform</span>
                    <span>Author McAuthory</span>
                  </div>
                </div>
                <div><img alt="" src="https://inkling.local/images/meta/inkling.png" /></div>
                <div></div>
              </div>
              <figcaption>
                <div data-inkling-allow-clickthrough="true">
                  <div>
                    <div data-inkling="editor">
                      <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
                        <p dir="ltr">
                          <span data-lexical-text="true">My test caption</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </figcaption>
            </div>
            <div data-inkling-card-toolbar="bookmark"></div>
          </div>
        </div>
        <p><br /></p>
      `,
      { ignoreCardToolbarContents: true, ignoreInnerSVG: true },
    )
  })

  test('escape removes url input component', async function () {
    await focusEditor(page)
    await insertCard(page, { cardName: 'bookmark' })

    await page.keyboard.press('Escape')

    await assertHTML(page, html` <p><br /></p> `, { ignoreCardContents: true })
  })

  test('escape removes url error component', async function () {
    await focusEditor(page)
    await insertCard(page, { cardName: 'bookmark' })

    await page.keyboard.type('badurl')
    await page.keyboard.press('Enter')

    await expect(await page.getByTestId('bookmark-url-error-message')).toContainText("Oops, that link didn't work.")

    await page.keyboard.press('Escape')

    await assertHTML(page, html` <p><br /></p> `, { ignoreCardContents: true })
  })
})
