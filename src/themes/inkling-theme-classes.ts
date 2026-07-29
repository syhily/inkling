import type { EditorThemeClasses } from 'lexical'

/**
 * Inkling's custom theme keys. Upstream's EditorThemeClasses ends in an
 * upstream `[key: string]: any` index signature, so every read of these
 * keys is an unsafe-any cascade unless annotated at a boundary — this
 * interface is the boundary, and themeClassList is the one annotated read.
 */
export interface InklingThemeClasses extends EditorThemeClasses {
  atLink?: string
  atLinkIcon?: string
  atLinkSearch?: string
  tk?: string
  tkHighlighted?: string
}

/** Reads one custom theme key's classes as a list (empty-string entries dropped — classList.add('') throws). */
export function themeClassList(theme: EditorThemeClasses, key: keyof InklingThemeClasses): string[] {
  const value = (theme as InklingThemeClasses)[key]
  return (value || '').split(' ').filter(Boolean)
}
