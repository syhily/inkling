import type { ExportDOMOutput } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

import { renderEmptyContainer, type EmptyContainerOutput } from '@/nodes/base/utils/render-empty-container'

export const ALL_MEMBERS_SEGMENT = 'status:free,status:-free'
export const PAID_MEMBERS_SEGMENT = 'status:-free' // paid + comped + gift
export const FREE_MEMBERS_SEGMENT = 'status:free'
export const NO_MEMBERS_SEGMENT = ''

export interface WebVisibility {
  nonMember?: boolean
  memberSegment?: string
}

export interface EmailVisibility {
  memberSegment?: string
}

// Visibility can be in old or new format
export interface Visibility {
  web?: WebVisibility
  email?: EmailVisibility
  showOnEmail?: boolean
  showOnWeb?: boolean
  emailOnly?: boolean
  segment?: string
  [key: string]: unknown
}

// the fully-populated new format that buildDefaultVisibility creates and that
// migrateOldVisibilityFormat normalizes old/partial payloads toward
export interface DefaultVisibility extends Visibility {
  web: { nonMember: boolean; memberSegment: string }
  email: { memberSegment: string }
}

const DEFAULT_VISIBILITY: DefaultVisibility = {
  web: {
    nonMember: true,
    memberSegment: ALL_MEMBERS_SEGMENT,
  },
  email: {
    memberSegment: ALL_MEMBERS_SEGMENT,
  },
}

function isNullish(value: unknown) {
  return value === null || value === undefined
}

// ensure we always work with a deep copy to avoid accidental ref mutations
export function buildDefaultVisibility(): DefaultVisibility {
  const parsed: DefaultVisibility = JSON.parse(JSON.stringify(DEFAULT_VISIBILITY))
  return parsed
}

export function isOldVisibilityFormat(visibility: Visibility) {
  return (
    !Object.prototype.hasOwnProperty.call(visibility, 'web') ||
    !Object.prototype.hasOwnProperty.call(visibility, 'email') ||
    !Object.prototype.hasOwnProperty.call(visibility.web ?? {}, 'nonMember') ||
    isNullish(visibility.web?.memberSegment) ||
    isNullish(visibility.email?.memberSegment)
  )
}

export function isVisibilityRestricted(visibility: Visibility) {
  // migrateOldVisibilityFormat returns new-format input unchanged
  const migratedVisibility = migrateOldVisibilityFormat(visibility)

  return (
    migratedVisibility.web?.nonMember === false ||
    migratedVisibility.web?.memberSegment !== ALL_MEMBERS_SEGMENT ||
    migratedVisibility.email?.memberSegment !== ALL_MEMBERS_SEGMENT
  )
}

// old formats...
//
// "segment" only applies to email visibility
// {emailOnly: true/false, segment: ''}
// {showOnWeb: true/false, showOnEmail: true/false, segment: 'status:free,status:-free'}
//
// segment: '' = everyone
// segment: 'status:free' = free members
// segment: 'status:paid' = paid members (incorrect, misses comped + gift)
// segment: 'status:-free' = paid members (correct, includes comped + gift)
// segment: 'status:-free+status:-paid' = no-one (incorrect, misses comped + gift)
//
// new format...
//
// {
//     web: {
//         nonMember: true/false,
//         memberSegment: 'status:free,status:-free'
//     },
//     email: {
//         memberSegment: 'status:free,status:-free'
//     }
// }
//
// memberSegment: '' = no-one
// memberSegment: 'status:free,status:-free' = everyone
// memberSegment: 'status:free' = free members
// memberSegment: 'status:-free' = paid + comped + gift members
export function migrateOldVisibilityFormat(visibility: Visibility): Visibility
export function migrateOldVisibilityFormat(visibility: Visibility | undefined): Visibility | undefined
export function migrateOldVisibilityFormat(visibility: Visibility | undefined): Visibility | undefined {
  if (!visibility || !isOldVisibilityFormat(visibility)) {
    return visibility
  }

  // deep clone to avoid mutating the original object
  const newVisibility: Visibility = JSON.parse(JSON.stringify(visibility))

  // ensure we have expected objects ready to populate
  newVisibility.web ??= {}
  newVisibility.email ??= {}

  // convert web visibility, old formats only had on/off for web visibility rather than specific segments
  if (isNullish(visibility.showOnWeb) && isNullish(visibility.emailOnly)) {
    newVisibility.web = buildDefaultVisibility().web
  } else if (!isNullish(visibility.emailOnly)) {
    newVisibility.web.nonMember = !visibility.emailOnly
    newVisibility.web.memberSegment = visibility.emailOnly ? NO_MEMBERS_SEGMENT : ALL_MEMBERS_SEGMENT
  } else {
    newVisibility.web.nonMember = visibility.showOnWeb
    newVisibility.web.memberSegment = visibility.showOnWeb ? ALL_MEMBERS_SEGMENT : NO_MEMBERS_SEGMENT
  }

  // convert email visibility, taking into account the old (and sometimes incorrect) segment formats
  if (isNullish(visibility.showOnEmail) && isNullish(visibility.emailOnly)) {
    newVisibility.email = buildDefaultVisibility().email
  } else if (visibility.showOnEmail === false) {
    newVisibility.email.memberSegment = NO_MEMBERS_SEGMENT
  } else if (visibility.segment === 'status:-free+status:-paid') {
    newVisibility.email.memberSegment = NO_MEMBERS_SEGMENT
  } else if (visibility.segment === 'status:free') {
    newVisibility.email.memberSegment = FREE_MEMBERS_SEGMENT
  } else if (visibility.segment === 'status:paid' || visibility.segment === 'status:-free') {
    newVisibility.email.memberSegment = PAID_MEMBERS_SEGMENT
  } else if (!visibility.segment) {
    newVisibility.email.memberSegment = ALL_MEMBERS_SEGMENT
  } else {
    // unrecognized segments (e.g. the all-members 'status:free,status:-free' the
    // old format could already carry) pass through verbatim — previously they hit
    // no branch and the email renderer emitted data-gh-segment="undefined"
    newVisibility.email.memberSegment = visibility.segment
  }

  return newVisibility
}

export function renderWithVisibility<T extends ExportDOMOutput>(
  originalRenderOutput: T,
  visibility: Visibility | undefined,
  // `target` is optional: omitting it takes the web path (context.target is
  // only ever compared against 'email')
  context: Partial<Pick<RenderContext, 'target'>>,
): T | EmptyContainerOutput | ExportDOMOutput<'outer'> | ExportDOMOutput<'value'> {
  if (!visibility) {
    return originalRenderOutput
  }

  const { element } = originalRenderOutput

  if (!element || !('ownerDocument' in element)) {
    return originalRenderOutput
  }

  const document = element.ownerDocument
  const content = _getRenderContent(originalRenderOutput)

  const migrated = migrateOldVisibilityFormat(visibility)

  const email = migrated.email ?? { memberSegment: ALL_MEMBERS_SEGMENT }
  const web = migrated.web ?? { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT }

  if (context.target === 'email') {
    if (email.memberSegment === NO_MEMBERS_SEGMENT) {
      return renderEmptyContainer(document)
    }

    if (email.memberSegment === ALL_MEMBERS_SEGMENT) {
      return originalRenderOutput
    }

    return _renderWithEmailVisibility(document, content, email)
  }

  const isNotVisibleOnWeb = web.nonMember === false && web.memberSegment === NO_MEMBERS_SEGMENT

  if (isNotVisibleOnWeb) {
    return renderEmptyContainer(document)
  }

  const hasWebVisibilityRestrictions = web.nonMember !== true || web.memberSegment !== ALL_MEMBERS_SEGMENT

  if (hasWebVisibilityRestrictions) {
    return _renderWithWebVisibility(document, content, web)
  }

  return originalRenderOutput
}

/* Private functions -------------------------------------------------------- */

function _getRenderContent({ element, type }: ExportDOMOutput) {
  if (type === 'inner') {
    if (element && 'innerHTML' in element) {
      return element.innerHTML
    }

    return ''
  } else if (type === 'value') {
    if (element && 'value' in element && typeof element.value === 'string') {
      return element.value
    }

    return ''
  } else {
    if (element && 'outerHTML' in element) {
      return element.outerHTML
    }

    return ''
  }
}

function _renderWithEmailVisibility(
  document: Document,
  content: string,
  emailVisibility: EmailVisibility,
): ExportDOMOutput<'outer'> {
  // migration always populates memberSegment; fail closed if it somehow isn't
  const { memberSegment = NO_MEMBERS_SEGMENT } = emailVisibility
  const container = document.createElement('div')
  container.innerHTML = content
  container.setAttribute('data-gh-segment', memberSegment)
  container.classList.add('inkling-visibility-wrapper')
  return { element: container, type: 'outer' as const }
}

const SEGMENT_REGEX = /^(status:[\w+-]+,)*status:[\w+-]+$/

function _renderWithWebVisibility(
  document: Document,
  content: string,
  webVisibility: WebVisibility,
): ExportDOMOutput<'value'> {
  const { nonMember, memberSegment = '' } = webVisibility
  // the marker is embedded in an HTML comment that downstream publishers parse;
  // a memberSegment containing `-->` would terminate the comment early, so only
  // the documented segment alphabet (or '' for no-one) is interpolated
  const safeSegment = memberSegment === '' || SEGMENT_REGEX.test(memberSegment) ? memberSegment : ''
  const safeNonMember = nonMember === true
  const wrappedContent = `\n<!--inkling-gated-block:begin nonMember:${safeNonMember} memberSegment:"${safeSegment}" -->${content}<!--inkling-gated-block:end-->\n`
  const textarea = document.createElement('textarea')
  textarea.value = wrappedContent
  return { element: textarea, type: 'value' as const }
}
