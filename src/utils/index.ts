// publicly exported util functions
// merged from @inkling/utils
export { DEFAULT_INKLING_VERSION, default as slugify, isLegacyVersion } from '@/utils/slugify'
export { default as countWords } from '@/utils/countWords'
export { Color, textColorForBackgroundColor } from '@/utils/colorUtils'
export { debounce, throttle } from '@/utils/timing'
export { escapeRegExp, kebabCase, pick } from '@/utils/objects'
export { CARD_WIDTHS, isCardWidth, normalizeCardWidth, type CardWidth } from '@/nodes/base/utils/card-widths'
// original lexical utils
export * from '@/utils/$isAtStartOfDocument'
export * from '@/utils/$selectDecoratorNode'
export * from '@/utils/$isAtTopOfNode'
export * from '@/utils/getTopLevelNativeElement'
