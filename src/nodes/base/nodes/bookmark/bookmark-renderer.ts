import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'
import { escapeHtml } from '@/nodes/base/utils/escape-html'
import { isSafeMediaUrl, isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { renderEmptyContainer } from '@/nodes/base/utils/render-empty-container'
import { truncateHtml } from '@/nodes/base/utils/truncate'
import { sanitizeHtml } from '@/utils/sanitize-html'

interface BookmarkNodeData {
  url: string
  title: string
  description: string
  icon: string
  author: string
  publisher: string
  thumbnail: string
  caption: string
}

function getSafeMediaUrls(node: BookmarkNodeData) {
  return {
    safeIcon: isSafeMediaUrl(node.icon) ? node.icon : '',
    safeThumbnail: isSafeMediaUrl(node.thumbnail) ? node.thumbnail : '',
  }
}

export function renderBookmarkNode(node: BookmarkNodeData, options: ExportDOMOptions = {}) {
  addCreateDocumentOption(options)

  const document = options.createDocument!()

  if (!node.url || node.url.trim() === '' || !isSafeUrl(node.url)) {
    return renderEmptyContainer(document)
  }

  if (options.target === 'email') {
    return emailTemplate(node, document)
  } else {
    return frontendTemplate(node, document)
  }
}

function emailTemplate(node: BookmarkNodeData, document: Document) {
  const title = escapeHtml(node.title)
  const publisher = escapeHtml(node.publisher)
  const author = escapeHtml(node.author)
  const description = node.description

  const safeUrl = isSafeUrl(node.url) ? node.url : ''
  const { safeIcon, safeThumbnail } = getSafeMediaUrls(node)
  const caption = escapeHtml(node.caption)

  const element = document.createElement('div')

  const html = `
        <!--[if !mso !vml]-->
            <figure class="inkling-card inkling-bookmark-card ${node.caption ? `inkling-card-hascaption` : ''}">
                <a class="inkling-bookmark-container" href="${escapeHtml(safeUrl)}">
                    <div class="inkling-bookmark-content">
                        <div class="inkling-bookmark-title">${title}</div>
                        <div class="inkling-bookmark-description">${truncateHtml(description, 120, 90)}</div>
                        <div class="inkling-bookmark-metadata">
                            ${safeIcon ? `<img class="inkling-bookmark-icon" src="${escapeHtml(safeIcon)}" alt="">` : ''}
                            ${publisher ? `<span class="inkling-bookmark-author" src="${publisher}">${publisher}</span>` : ''}
                            ${author ? `<span class="inkling-bookmark-publisher" src="${author}">${author}</span>` : ''}
                        </div>
                    </div>
                    ${
                      safeThumbnail
                        ? `<div class="inkling-bookmark-thumbnail" style="background-image: url('${escapeHtml(safeThumbnail)}')">
                        <img src="${escapeHtml(safeThumbnail)}" alt="" onerror="this.style.display='none'"></div>`
                        : ''
                    }
                </a>
                ${caption ? `<figcaption>${caption}</figcaption>` : ''}
            </figure>
        <!--[endif]-->
        <!--[if vml]>
            <table class="inkling-card inkling-bookmark-card--outlook" style="margin: 0; padding: 0; width: 100%; border: 1px solid #e5eff5; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; border-collapse: collapse; border-spacing: 0;" width="100%">
                <tr>
                    <td width="100%" style="padding: 20px;">
                        <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                            <tr>
                                <td class="inkling-bookmark-title--outlook">
                                    <a href="${escapeHtml(safeUrl)}" style="text-decoration: none; color: #15212A; font-size: 15px; line-height: 1.5em; font-weight: 600;">
                                        ${title}
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div class="inkling-bookmark-description--outlook">
                                        <a href="${escapeHtml(safeUrl)}" style="text-decoration: none; margin-top: 12px; color: #738a94; font-size: 13px; line-height: 1.5em; font-weight: 400;">
                                            ${truncateHtml(description, 120, 90)}
                                        </a>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td class="inkling-bookmark-metadata--outlook" style="padding-top: 14px; color: #15212A; font-size: 13px; font-weight: 400; line-height: 1.5em;">
                                    <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                                        <tr>
                                            ${
                                              safeIcon
                                                ? `
                                                <td valign="middle" class="inkling-bookmark-icon--outlook" style="padding-right: 8px; font-size: 0; line-height: 1.5em;">
                                                    <a href="${escapeHtml(safeUrl)}" style="text-decoration: none; color: #15212A;">
                                                        <img src="${escapeHtml(safeIcon)}" width="22" height="22" alt=" ">
                                                    </a>
                                                </td>
                                            `
                                                : ''
                                            }
                                            <td valign="middle" class="inkling-bookmark-byline--outlook">
                                                <a href="${escapeHtml(safeUrl)}" style="text-decoration: none; color: #15212A;">
                                                    ${publisher}
                                                    ${author ? `&nbsp;&#x2022;&nbsp;` : ''}
                                                    ${author}
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <div class="inkling-bookmark-spacer--outlook" style="height: 1.5em;">&nbsp;</div>
        <![endif]-->`

  element.innerHTML = html
  return { element, type: 'outer' as const }
}

function frontendTemplate(node: BookmarkNodeData, document: Document) {
  const { safeIcon, safeThumbnail } = getSafeMediaUrls(node)

  const element = document.createElement('figure')
  const caption = node.caption
  let cardClass = 'inkling-card inkling-bookmark-card'
  if (caption) {
    cardClass += ' inkling-card-hascaption'
  }
  element.setAttribute('class', cardClass)

  const container = document.createElement('a')
  container.setAttribute('class', 'inkling-bookmark-container')
  container.href = isSafeUrl(node.url) ? node.url : ''
  element.appendChild(container)

  const content = document.createElement('div')
  content.setAttribute('class', 'inkling-bookmark-content')
  container.appendChild(content)

  const title = document.createElement('div')
  title.setAttribute('class', 'inkling-bookmark-title')
  title.textContent = node.title
  content.appendChild(title)

  const description = document.createElement('div')
  description.setAttribute('class', 'inkling-bookmark-description')
  description.textContent = node.description
  content.appendChild(description)

  const metadata = document.createElement('div')
  metadata.setAttribute('class', 'inkling-bookmark-metadata')
  content.appendChild(metadata)

  if (safeIcon) {
    const icon = document.createElement('img')
    icon.setAttribute('class', 'inkling-bookmark-icon')
    icon.src = safeIcon
    icon.alt = ''
    metadata.appendChild(icon)
  }

  const nodePublisher = node.publisher
  if (nodePublisher) {
    const publisher = document.createElement('span')
    publisher.setAttribute('class', 'inkling-bookmark-author') // NOTE: This is NOT in error. The classes are reversed for theme backwards-compatibility.
    publisher.textContent = nodePublisher
    metadata.appendChild(publisher)
  }

  const nodeAuthor = node.author
  if (nodeAuthor) {
    const author = document.createElement('span')
    author.setAttribute('class', 'inkling-bookmark-publisher') // NOTE: This is NOT in error. The classes are reversed for theme backwards-compatibility.
    author.textContent = nodeAuthor
    metadata.appendChild(author)
  }

  if (safeThumbnail) {
    const thumbnailDiv = document.createElement('div')
    thumbnailDiv.setAttribute('class', 'inkling-bookmark-thumbnail')
    container.appendChild(thumbnailDiv)

    const thumbnail = document.createElement('img')
    thumbnail.src = safeThumbnail
    thumbnail.alt = ''
    thumbnail.setAttribute('onerror', `this.style.display = 'none'`) // Hide thumbnail div if image fails to load
    thumbnailDiv.appendChild(thumbnail)
  }

  if (caption) {
    const figCaption = document.createElement('figcaption')
    figCaption.innerHTML = sanitizeHtml(caption)
    element.appendChild(figCaption)
  }

  return { element, type: 'outer' as const }
}
