import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertHTML, focusEditor, html, initialize, insertCard, pasteText, selectBackwards } from '#/utils/e2e'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const visibleEmailMenuItems = ['Image', 'Unsplash', 'GIF', 'Bookmark', 'Button', 'Callout', 'HTML', 'Divider']

const unavailableEmailMenuItems = [
  'Audio',
  'Gallery',
  'Video',
  'File',
  'Markdown',
  'Header',
  'Public preview',
  'Toggle',
  'Signup',
  'Call to action',
  'Product',
  'YouTube',
  'Vimeo',
  'SoundCloud',
  'Spotify',
  'CodePen',
  'X (formerly Twitter)',
  'Other...',
]

const smokeTestInsertions = [
  { shortcut: 'button', menuItem: 'Button', selector: '[data-inkling-card="button"]' },
  { shortcut: 'callout', menuItem: 'Callout', selector: '[data-inkling-card="callout"]' },
  { shortcut: 'html', menuItem: 'HTML', selector: '[data-inkling-card="html"]' },
  { shortcut: 'divider', menuItem: 'Divider', selector: '[data-inkling-card="horizontalrule"]' },
]

async function insertCardFromMenu(page, { shortcut, menuItem, selector }) {
  await focusEditor(page)
  await page.keyboard.type(`/${shortcut}`)
  await expect(page.locator(`[data-inkling-card-menu-item="${menuItem}" i]`)).toBeVisible()
  await page.locator(`[data-inkling-card-menu-item="${menuItem}" i]`).click()
  await expect(page.locator(selector)).toBeVisible()
}

test.describe('Inkling Editor with email template nodes', async function () {
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.beforeEach(async () => {
    await initialize({ page, uri: '/#/email?content=false' })
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.describe('Basic functionality', function () {
    test('can navigate to email editor', async function () {
      await focusEditor(page)
      await expect(page.locator('[data-inkling="editor"]')).toBeVisible()
    })

    test('shows correct placeholder text', async function () {
      await expect(page.locator('text=Begin writing your email...')).toBeVisible()
    })

    test('renders email header with From and Subject fields', async function () {
      await expect(page.locator('text=From:')).toBeVisible()
      await expect(page.locator('text=Inkling <noreply@example.com>')).toBeVisible()
      await expect(page.locator('text=Subject:')).toBeVisible()
      await expect(page.locator('text=Welcome to Inkling')).toBeVisible()
    })

    test('title is hidden', async function () {
      await expect(page.locator('[data-testid="post-title"]')).toHaveCount(0)
    })
  })

  test.describe('Supported features', function () {
    test('can add basic text', async function () {
      await focusEditor(page)
      await page.keyboard.type('Hello World')

      await assertHTML(page, html` <p dir="ltr"><span data-lexical-text="true">Hello World</span></p> `)
    })

    test('can add multiple paragraphs', async function () {
      await focusEditor(page)
      await page.keyboard.type('First paragraph')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Second paragraph')

      await assertHTML(
        page,
        html`
          <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
          <p dir="ltr"><span data-lexical-text="true">Second paragraph</span></p>
        `,
      )
    })

    test('can create headings with ## shortcut', async function () {
      await focusEditor(page)
      await page.keyboard.type('## Heading 2')

      await assertHTML(page, html` <h2 dir="ltr"><span data-lexical-text="true">Heading 2</span></h2> `)
    })

    test('can create unordered lists with - shortcut', async function () {
      await focusEditor(page)
      await page.keyboard.type('- List item')

      await assertHTML(
        page,
        html`
          <ul>
            <li value="1" dir="ltr"><span data-lexical-text="true">List item</span></li>
          </ul>
        `,
      )
    })

    test('can create ordered lists with 1. shortcut', async function () {
      await focusEditor(page)
      await page.keyboard.type('1. List item')

      await assertHTML(
        page,
        html`
          <ol>
            <li value="1" dir="ltr"><span data-lexical-text="true">List item</span></li>
          </ol>
        `,
      )
    })

    test('can create horizontal rules with --- shortcut', async function () {
      await focusEditor(page)
      await page.keyboard.type('---')

      await assertHTML(
        page,
        html`
          <div data-lexical-decorator="true" contenteditable="false">
            <div
              data-inkling-card-editing="false"
              data-inkling-card-selected="false"
              data-inkling-card="horizontalrule"
            >
              <hr />
            </div>
          </div>
          <p><br /></p>
        `,
        { ignoreCardToolbarContents: true },
      )
    })

    test('list backspace at start converts to paragraph', async function () {
      await focusEditor(page)
      await page.keyboard.type('- Item')
      // Move to start of line
      await page.keyboard.press('Home')
      await page.keyboard.press('Backspace')

      await assertHTML(page, html` <p dir="ltr"><span data-lexical-text="true">Item</span></p> `)
    })

    test('can create blockquote with > shortcut', async function () {
      await focusEditor(page)
      await page.keyboard.type('> This is a quote')

      await assertHTML(
        page,
        html` <blockquote dir="ltr"><span data-lexical-text="true">This is a quote</span></blockquote> `,
      )
    })

    test('pasting URL on blank paragraph creates an embed or bookmark card', async function () {
      await focusEditor(page)
      await pasteText(page, 'https://inkling.local/')

      const embedCard = page.getByTestId('embed-iframe')
      const bookmarkCard = page.getByTestId('bookmark-container')

      await expect(embedCard.or(bookmarkCard)).toBeVisible()
    })

    test('bookmark card fetches metadata from URL input', async function () {
      await focusEditor(page)
      await insertCard(page, { cardName: 'bookmark' })

      const urlInput = page.getByTestId('bookmark-url')
      await expect(urlInput).toBeVisible()
      await urlInput.fill('https://inkling.local/')
      await urlInput.press('Enter')

      await expect(page.getByTestId('bookmark-title')).toContainText('Inkling')
    })

    test('image card hides width controls when only one width is configured', async function () {
      const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png')

      await focusEditor(page)
      await insertCard(page, { cardName: 'image' })

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('button[name="placeholder-button"]'),
      ])
      await fileChooser.setFiles([filePath])

      await expect(page.getByTestId('image-card-populated')).toBeVisible()
      await expect(page.getByTestId('progress-bar')).toBeHidden()

      await page.click('[data-inkling-card="image"]')
      await expect(page.locator('[data-inkling-card-toolbar="image"]')).toBeVisible()

      await expect(page.locator('[data-inkling-card-toolbar="image"] button[aria-label="Regular width"]')).toHaveCount(
        0,
      )
      await expect(page.locator('[data-inkling-card-toolbar="image"] button[aria-label="Wide width"]')).toHaveCount(0)
      await expect(page.locator('[data-inkling-card-toolbar="image"] button[aria-label="Full width"]')).toHaveCount(0)
    })
  })

  test.describe('Unsupported features', function () {
    test('code block shortcut does NOT create code block', async function () {
      await focusEditor(page)
      await page.keyboard.type('```javascript ')

      // Should remain as plain text, not a code block
      await assertHTML(page, html` <p dir="ltr"><span data-lexical-text="true">\`\`\`javascript </span></p> `)
    })
  })

  test.describe('Card menu', function () {
    test('slash menu is available', async function () {
      await focusEditor(page)
      await expect(page.locator('[data-inkling-slash-menu]')).toHaveCount(0)
      await page.keyboard.type('/')
      await expect(page.locator('[data-inkling-slash-menu]')).toBeVisible()
    })

    test('shows the supported email card menu items', async function () {
      await focusEditor(page)
      await page.keyboard.type('/')
      await expect(page.locator('[data-inkling-slash-menu]')).toBeVisible()

      for (const label of visibleEmailMenuItems) {
        await expect(page.locator(`[data-inkling-card-menu-item="${label}"]`)).toBeVisible()
      }

      for (const label of unavailableEmailMenuItems) {
        await expect(page.locator(`[data-inkling-card-menu-item="${label}"]`)).toHaveCount(0)
      }
    })

    for (const { shortcut, menuItem, selector } of smokeTestInsertions) {
      test(`can insert ${menuItem} via slash menu`, async function () {
        await insertCardFromMenu(page, { shortcut, menuItem, selector })
      })
    }

    test('plus button is shown', async function () {
      await focusEditor(page)
      await expect(page.locator('[data-inkling-plus-button]')).toBeVisible()
    })
  })

  test.describe('Floating format toolbar', function () {
    test('appears on text selection', async function () {
      await focusEditor(page)
      await page.keyboard.type('text for selection')

      await expect(page.locator('[data-inkling-floating-toolbar]')).toHaveCount(0)

      // Select text
      await selectBackwards(page, 'for selection'.length)

      await expect(page.locator('[data-inkling-floating-toolbar]')).toBeVisible()
    })

    test('has heading buttons', async function () {
      await focusEditor(page)
      await page.keyboard.type('text for selection')

      // Select text
      await selectBackwards(page, 'for selection'.length)

      await expect(page.locator('[data-inkling-floating-toolbar]')).toBeVisible()

      // Email editor should have heading buttons (unlike basic/minimal)
      const h2ButtonSelector = '[data-inkling-floating-toolbar] [data-inkling-toolbar-button="h2"] button'
      await expect(page.locator(h2ButtonSelector)).toBeVisible()
    })

    test('has quote button', async function () {
      await focusEditor(page)
      await page.keyboard.type('text for selection')

      // Select text
      await selectBackwards(page, 'for selection'.length)

      await expect(page.locator('[data-inkling-floating-toolbar]')).toBeVisible()

      const quoteButtonSelector = '[data-inkling-floating-toolbar] [data-inkling-toolbar-button="quote"] button'
      await expect(page.locator(quoteButtonSelector)).toBeVisible()
    })

    test('has link button', async function () {
      await focusEditor(page)
      await page.keyboard.type('text for selection')

      // Select text
      await selectBackwards(page, 'for selection'.length)

      await expect(page.locator('[data-inkling-floating-toolbar]')).toBeVisible()

      const linkButtonSelector = '[data-inkling-floating-toolbar] [data-inkling-toolbar-button="link"] button'
      await expect(page.locator(linkButtonSelector)).toBeVisible()
    })

    test('has snippet button', async function () {
      await focusEditor(page)
      await page.keyboard.type('text for selection')

      // Select text
      await selectBackwards(page, 'for selection'.length)

      await expect(page.locator('[data-inkling-floating-toolbar]')).toBeVisible()

      const snippetButtonSelector = '[data-inkling-floating-toolbar] [data-inkling-toolbar-button="snippet"] button'
      await expect(page.locator(snippetButtonSelector)).toBeVisible()
    })
  })
})
