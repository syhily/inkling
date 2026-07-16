import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import { isSafeColorValue, type RenderContext } from '@/nodes/base/render-context'
import { getFirstHtmlElement } from '@/nodes/base/utils/get-first-html-element'
import { renderEmailButton } from '@/nodes/base/utils/render-helpers/email-button'
import { getSrcsetAttribute, type ImageRenderOptions } from '@/nodes/base/utils/srcset-attribute'
import { slugify } from '@/utils/slugify'

interface HeaderV2NodeData {
  alignment: string
  buttonText: string
  buttonEnabled: boolean
  buttonUrl: string
  header: string
  subheader: string
  backgroundImageSrc: string
  backgroundImageWidth: number | null
  backgroundImageHeight: number | null
  backgroundSize: string
  backgroundColor: string
  buttonColor: string
  layout: string
  textColor: string
  buttonTextColor: string
  swapped: boolean
  accentColor: string
}

interface HeaderV2DatasetNode {
  __alignment: string
  __buttonText: string
  __buttonEnabled: boolean
  __buttonUrl: string
  __header: string
  __subheader: string
  __backgroundImageSrc: string
  __backgroundImageWidth: number | null
  __backgroundImageHeight: number | null
  __backgroundSize: string
  __backgroundColor: string
  __buttonColor: string
  __layout: string
  __textColor: string
  __buttonTextColor: string
  __swapped: boolean
  __accentColor: string
}

interface HeaderV2RenderOptions extends ExportDOMOptions {}

// Colors come from document JSON, not just the color picker — constrain to
// values the picker can produce before interpolating into style/attributes.
// The predicate is single-sourced in the render-context module; note header
// legitimately falls back to 'transparent', so it must NOT use the stricter
// email-button predicate.
function safeColor(value: string, fallback: string): string {
  return isSafeColorValue(value) ? value : fallback
}

function cardTemplate(nodeData: HeaderV2NodeData, context: RenderContext, options: HeaderV2RenderOptions = {}) {
  const cardClasses = getCardClasses(nodeData).join(' ')

  const safeBackgroundImageSrc = context.safeUrl('media', nodeData.backgroundImageSrc)
  const safeButtonUrl = context.safeUrl('navigation', nodeData.buttonUrl)
  const headerText = nodeData.header ? context.escapeText(nodeData.header) : ''
  const subheaderText = nodeData.subheader ? context.escapeText(nodeData.subheader) : ''
  const buttonText = nodeData.buttonText ? context.escapeText(nodeData.buttonText) : ''

  const textColor = safeColor(nodeData.textColor, '#000000')
  const buttonTextColor = safeColor(nodeData.buttonTextColor, '#000000')
  const buttonColor = nodeData.buttonColor === 'accent' ? 'accent' : safeColor(nodeData.buttonColor, 'transparent')
  const backgroundColor =
    nodeData.backgroundColor === 'accent' ? 'accent' : safeColor(nodeData.backgroundColor, 'transparent')

  const backgroundAccent = nodeData.backgroundColor === 'accent' ? 'inkling-style-accent' : ''
  const buttonAccent = nodeData.buttonColor === 'accent' ? 'inkling-style-accent' : ''
  const buttonStyle = nodeData.buttonColor !== 'accent' ? `background-color: ${buttonColor};` : ``
  const alignment = nodeData.alignment === 'center' ? 'inkling-align-center' : ''
  const backgroundImageStyle =
    nodeData.backgroundColor !== 'accent' && (!safeBackgroundImageSrc || nodeData.layout === 'split')
      ? `background-color: ${backgroundColor}`
      : ''

  let imgTemplate = ''
  if (safeBackgroundImageSrc) {
    const bgImage = {
      src: safeBackgroundImageSrc,
      width: nodeData.backgroundImageWidth,
      height: nodeData.backgroundImageHeight,
    }

    const srcsetValue =
      bgImage.width !== null
        ? getSrcsetAttribute({
            src: bgImage.src,
            width: bgImage.width,
            options: options as ImageRenderOptions,
            context,
          })
        : ''
    const srcset = srcsetValue ? `srcset="${srcsetValue}"` : ''

    imgTemplate = `
            <picture><img class="inkling-header-card-image" src="${bgImage.src}" ${srcset} loading="lazy" alt="" /></picture>
        `
  }

  const header = () => {
    if (nodeData.header) {
      return `<h2 id="${slugify(nodeData.header)}" class="inkling-header-card-heading" style="color: ${textColor};" data-text-color="${textColor}">${headerText}</h2>`
    }
    return ''
  }

  const subheader = () => {
    if (nodeData.subheader) {
      return `<p id="${slugify(nodeData.subheader)}" class="inkling-header-card-subheading" style="color: ${textColor};" data-text-color="${textColor}">${subheaderText}</p>`
    }
    return ''
  }

  const button = () => {
    if (nodeData.buttonEnabled && safeButtonUrl) {
      return `<a href="${safeButtonUrl}" class="inkling-header-card-button ${buttonAccent}" style="${buttonStyle}color: ${buttonTextColor};" data-button-color="${buttonColor}" data-button-text-color="${buttonTextColor}">${buttonText}</a>`
    }
    return ''
  }

  const wrapperStyle = backgroundImageStyle ? `style="${backgroundImageStyle};"` : ''

  return `
        <div class="${cardClasses} ${backgroundAccent}" ${wrapperStyle} data-background-color="${backgroundColor}">
            ${nodeData.layout !== 'split' ? imgTemplate : ''}
            <div class="inkling-header-card-content">
                ${nodeData.layout === 'split' ? imgTemplate : ''}
                <div class="inkling-header-card-text ${alignment}">
                    ${header()}
                    ${subheader()}
                    ${button()}
                </div>
            </div>
        </div>
        `
}

interface MSOHeaderData {
  backgroundSize: string
  backgroundImageSrc: string
  backgroundColor: string
  layout: string
}

// Callers must pass sanitized values (context.safeUrl/safeColor) — these
// helpers interpolate directly into VML attributes.
function generateMSOSplitHeaderImage(nodeData: MSOHeaderData) {
  const { backgroundSize, backgroundImageSrc, backgroundColor } = nodeData

  if (backgroundSize === 'contain') {
    return `
            <!--[if mso]>
                <v:rect xmlns:v="urn:schemas-microsoft-com:vml" stroke="false" style="width:600px;height:320px;">
                    <v:fill type="frame" aspect="atmost" size="225pt,120pt" src="${backgroundImageSrc}" color="${backgroundColor}" />
                    <v:textbox inset="0,0,0,0">
                    </v:textbox>
                </v:rect>
            <![endif]-->
            `
  } else {
    return `
            <!--[if mso]>
                <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:320px;">
                    <v:fill type="frame" aspect="atleast" src="${backgroundImageSrc}" color="${backgroundColor}" />
                    <v:textbox inset="0,0,0,0">
                    </v:textbox>
                </v:rect>
            <![endif]-->
            `
  }
}

function generateMSOContentWrapper(nodeData: MSOHeaderData) {
  const { backgroundImageSrc, backgroundColor } = nodeData
  const hasContainAndSplit = nodeData.backgroundSize === 'contain' && nodeData.layout === 'split'
  const hasImageWithoutSplit = Boolean(backgroundImageSrc) && nodeData.layout !== 'split'

  // Outlook clients will return the first td, all other clients will return the second td
  const msoOpenTag = `
                    <!--[if mso]>
                        <td class="inkling-header-card-content" style="${hasImageWithoutSplit ? 'padding: 0;' : 'padding: 40px;'}${hasContainAndSplit ? 'padding-top: 0;' : ''}">
                    <![endif]-->
                    <!--[if !mso]><!-->
                        <td class="inkling-header-card-content" style="${hasContainAndSplit ? 'padding-top: 0;' : ''}">
                    <!--<![endif]-->
                    `

  const msoImageVML = hasImageWithoutSplit
    ? `
                    <!--[if mso]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                            <v:fill src="${backgroundImageSrc}" color="${backgroundColor}" type="frame" aspect="atleast" focusposition="0.5,0.5" />
                            <v:textbox inset="30pt,30pt,30pt,30pt" style="mso-fit-shape-to-text:true;">
                    <![endif]-->
                    `
    : ''

  return msoOpenTag + msoImageVML
}

function generateMSOContentClosing(nodeData: MSOHeaderData) {
  const hasImageWithoutSplit = Boolean(nodeData.backgroundImageSrc) && nodeData.layout !== 'split'

  if (!hasImageWithoutSplit) {
    return ''
  }

  return `
        <!--[if mso]>
            </v:textbox>
        </v:rect>
        <![endif]-->
        `
}

function emailTemplate(nodeData: HeaderV2NodeData, context: RenderContext) {
  const safeBackgroundImageSrc = context.safeUrl('media', nodeData.backgroundImageSrc)
  const safeButtonUrl = context.safeUrl('navigation', nodeData.buttonUrl)
  const headerText = nodeData.header ? context.escapeText(nodeData.header) : ''
  const subheaderText = nodeData.subheader ? context.escapeText(nodeData.subheader) : ''
  const buttonText = nodeData.buttonText ? context.escapeText(nodeData.buttonText) : ''

  const textColor = safeColor(nodeData.textColor, '#000000')
  const buttonColor = nodeData.buttonColor === 'accent' ? 'accent' : safeColor(nodeData.buttonColor, 'transparent')
  const backgroundColor = safeColor(nodeData.backgroundColor, 'transparent')
  const accentColor = safeColor(nodeData.accentColor, 'transparent')

  const backgroundAccent = nodeData.backgroundColor === 'accent' ? `background-color: ${accentColor};` : ''
  const buttonAccent = nodeData.buttonColor === 'accent' ? `background-color: ${accentColor};` : buttonColor
  const buttonStyle = nodeData.buttonColor !== 'accent' ? `background-color: ${buttonColor};` : ''
  const buttonTextColor = safeColor(nodeData.buttonTextColor, '#000000')
  const alignment = nodeData.alignment === 'center' ? 'text-align: center;' : ''
  const backgroundImageStyle = safeBackgroundImageSrc
    ? nodeData.layout !== 'split'
      ? `background-image: url(${safeBackgroundImageSrc}); background-size: cover; background-position: center center;`
      : `background-color: ${backgroundColor};`
    : `background-color: ${backgroundColor};`
  const splitImageStyle = `background-image: url(${safeBackgroundImageSrc}); background-size: ${nodeData.backgroundSize !== 'contain' ? 'cover' : '50%'}; background-position: center`

  const hasDarkBg = textColor.toLowerCase() === '#ffffff'
  const backgroundClass = hasDarkBg ? 'inkling-header-card-dark-bg' : 'inkling-header-card-light-bg'
  const msoData: MSOHeaderData = {
    backgroundSize: nodeData.backgroundSize,
    backgroundImageSrc: safeBackgroundImageSrc,
    backgroundColor,
    layout: nodeData.layout,
  }

  const useModernButton = context.usesModernEmailButton()

  if (useModernButton) {
    return `
            <div class="inkling-header-card inkling-v2 ${backgroundClass}" style="color:${textColor}; ${alignment} ${backgroundImageStyle} ${backgroundAccent}">
                ${
                  nodeData.layout === 'split' && safeBackgroundImageSrc
                    ? `
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td background="${safeBackgroundImageSrc}" style="${splitImageStyle}" class="inkling-header-card-image" bgcolor="${backgroundColor}" align="center">
                                ${generateMSOSplitHeaderImage(msoData) /* mso-only img, no shared markup */}
                            </td>
                        </tr>
                    </table>
                `
                    : ''
                }
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="color:${textColor}; ${alignment} ${backgroundImageStyle} ${backgroundAccent}">
                    <tr>
                        ${generateMSOContentWrapper(msoData) /* creates correct opening td tag for any platform */}
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="${nodeData.alignment}">
                                        <h2 class="inkling-header-card-heading" style="color:${textColor};">${headerText}</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="inkling-header-card-subheading-wrapper" align="${nodeData.alignment}">
                                        <p class="inkling-header-card-subheading" style="color:${textColor};">${subheaderText}</p>
                                    </td>
                                </tr>
                                <tr>
                                    ${
                                      nodeData.buttonEnabled && safeButtonUrl
                                        ? `
                                        <td class="inkling-header-button-wrapper">
                                            ${renderEmailButton(
                                              {
                                                alignment: nodeData.alignment,
                                                color:
                                                  nodeData.buttonColor === 'accent'
                                                    ? accentColor
                                                    : safeColor(nodeData.buttonColor, 'transparent'),
                                                style: context.design?.buttonStyle === 'outline' ? 'outline' : 'fill',
                                                text: nodeData.buttonText || '',
                                                url: safeButtonUrl,
                                              },
                                              context,
                                            )}
                                        </td>
                                    `
                                        : ''
                                    }
                                </tr>
                            </table>
                ${generateMSOContentClosing(msoData) /* mso-only closing tags, no shared markup */}
                        </td>
                    </tr>
                </table>
            </div>
            `
  }

  return `
        <div class="inkling-header-card inkling-v2 ${backgroundClass}" style="color:${textColor}; ${alignment} ${backgroundImageStyle} ${backgroundAccent}">
            ${
              nodeData.layout === 'split' && safeBackgroundImageSrc
                ? `
                <div class="inkling-header-card-image" background="${safeBackgroundImageSrc}" style="${splitImageStyle}"></div>
            `
                : ''
            }
            <div class="inkling-header-card-content" style="${nodeData.layout === 'split' && nodeData.backgroundSize === 'contain' ? 'padding-top: 0;' : ''}">
                <h2 class="inkling-header-card-heading" style="color:${textColor};">${headerText}</h2>
                <p class="inkling-header-card-subheading" style="color:${textColor};">${subheaderText}</p>
                ${
                  nodeData.buttonEnabled && safeButtonUrl
                    ? `
                    <a class="inkling-header-card-button" href="${safeButtonUrl}" style="color: ${buttonTextColor}; ${buttonStyle} ${buttonAccent}">${buttonText}</a>
                `
                    : ''
                }
            </div>
        </div>
        `
}

export function renderHeaderNodeV2(
  dataset: HeaderV2DatasetNode,
  options: HeaderV2RenderOptions = {},
  context: RenderContext,
) {
  const document = context.createDocument()

  const node = {
    alignment: dataset.__alignment,
    buttonText: dataset.__buttonText,
    buttonEnabled: dataset.__buttonEnabled,
    buttonUrl: dataset.__buttonUrl,
    header: dataset.__header,
    subheader: dataset.__subheader,
    backgroundImageSrc: dataset.__backgroundImageSrc,
    backgroundImageWidth: dataset.__backgroundImageWidth,
    backgroundImageHeight: dataset.__backgroundImageHeight,
    backgroundSize: dataset.__backgroundSize,
    backgroundColor: dataset.__backgroundColor,
    buttonColor: dataset.__buttonColor,
    layout: dataset.__layout,
    textColor: dataset.__textColor,
    buttonTextColor: dataset.__buttonTextColor,
    swapped: dataset.__swapped,
    accentColor: dataset.__accentColor,
  }

  if (context.variant({ web: false, email: true })) {
    const emailDoc = context.createDocument()
    const emailDiv = emailDoc.createElement('div')

    emailDiv.innerHTML = emailTemplate(node, context)?.trim()

    return {
      element: getFirstHtmlElement(emailDiv, 'renderHeaderV2Node email') as HTMLDivElement,
      type: 'outer' as const,
    }
  }

  const htmlString = cardTemplate(node, context, options)

  const element = document.createElement('div')
  element.innerHTML = htmlString?.trim()

  if (node.header === '') {
    const h2Element = element.querySelector('.inkling-header-card-heading')
    if (h2Element) {
      h2Element.remove()
    }
  }

  if (node.subheader === '') {
    const pElement = element.querySelector('.inkling-header-card-subheading')
    if (pElement) {
      pElement.remove()
    }
  }

  return { element: getFirstHtmlElement(element, 'renderHeaderV2Node') as HTMLDivElement, type: 'outer' as const }
}

export function getCardClasses(nodeData: HeaderV2NodeData) {
  const cardClasses = ['inkling-card inkling-header-card inkling-v2']

  if (nodeData.layout && nodeData.layout !== 'split') {
    cardClasses.push(`inkling-width-${nodeData.layout}`)
  }

  if (nodeData.layout === 'split') {
    cardClasses.push('inkling-layout-split inkling-width-full')
  }

  if (nodeData.swapped && nodeData.layout === 'split') {
    cardClasses.push('inkling-swapped')
  }

  if (nodeData.layout && nodeData.layout === 'full') {
    cardClasses.push(`inkling-content-wide`)
  }

  if (nodeData.layout === 'split') {
    if (nodeData.backgroundSize === 'contain') {
      cardClasses.push('inkling-content-wide')
    }
  }

  return cardClasses
}
