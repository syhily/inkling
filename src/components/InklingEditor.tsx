import '@/styles/index.css'
import React from 'react'

import type { InklingSurfaceProps } from '@/components/InklingSurface'

import InklingSurface from '@/components/InklingSurface'
import { DefaultFeaturePlugins } from '@/plugins/DefaultFeaturePlugins'

export type InklingEditorProps = InklingSurfaceProps

const InklingEditor = ({ children, ...props }: InklingEditorProps) => {
  return (
    <InklingSurface {...props}>
      <DefaultFeaturePlugins />
      {children}
    </InklingSurface>
  )
}

export default InklingEditor
