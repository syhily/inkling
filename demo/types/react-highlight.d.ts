declare module 'react-highlight' {
  import type { FC, ReactNode } from 'react'

  interface HighlightProps {
    className?: string
    children?: ReactNode
  }

  const Highlight: FC<HighlightProps> & { default?: FC<HighlightProps> }
  export default Highlight
}
