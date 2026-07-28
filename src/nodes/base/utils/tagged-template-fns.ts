function _oneline(string: string) {
  return string
    .replace(/\n\s+/g, ' ') // Replace newlines + whitespace with single space
    .replace(/>\s+</g, '><') // Remove spaces between closing and opening tags
    .replace(/\s+>/g, '>') // Remove unnecessary whitespace inside tag
    .trim()
}

const oneline = function (strings: TemplateStringsArray | string, ...values: unknown[]) {
  // Handle case where a plain string is passed
  if (typeof strings === 'string') {
    return _oneline(strings)
  }

  // Handle tagged template literal case
  const result = strings.reduce((acc: string, str: string, i: number) => {
    // String() so falsy-but-real values (0, false) render instead of vanishing
    // oxlint-disable-next-line typescript/no-base-to-string -- generic tagged-template helper: stringifying arbitrary interpolated values is its contract
    return acc + str + String(values[i] ?? '')
  }, '')
  // Remove newline+indentation patterns while preserving intentional whitespace
  return _oneline(result)
}

// Using `html` as a synonym for `oneline` in order to get syntax highlighting in editors
const html = oneline

export { oneline, html }
