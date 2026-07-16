export const rgbToHex = (rgb: string) => {
  if (rgb === 'transparent') {
    return rgb
  }

  // Extract the red, green, and blue values from the RGB string
  const match = rgb.match(/\d+/g)
  // fewer than three components can't form a color — previously b came up
  // undefined and the result was garbage like '#0c22NaN' instead of null
  if (!match || match.length < 3) {
    return null
  }
  const [r, g, b] = match
  // Convert each component to hexadecimal
  const red = parseInt(r, 10).toString(16).padStart(2, '0')
  const green = parseInt(g, 10).toString(16).padStart(2, '0')
  const blue = parseInt(b, 10).toString(16).padStart(2, '0')
  // Concatenate the hexadecimal values
  const hex = `#${red}${green}${blue}`
  return hex
}
