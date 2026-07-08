import type { StorybookConfig } from '@storybook/react-vite'

import { createRequire } from 'node:module'
import path, { dirname, join } from 'node:path'
import { mergeConfig } from 'vite'

const require = createRequire(import.meta.url)

const config: StorybookConfig = {
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  viteFinal: async (viteConfig) => {
    return mergeConfig(viteConfig, {
      resolve: {
        alias: {
          '@/': path.resolve(import.meta.dirname, '../src') + path.sep,
          '#/': path.resolve(import.meta.dirname, '../test') + path.sep,
        },
      },
      optimizeDeps: {
        include: ['@storybook/react'],
      },
    })
  },
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [getAbsolutePath('@storybook/addon-links'), getAbsolutePath('@etchteam/storybook-addon-status')],
  features: {},
  docs: {},
}

export default config

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')))
}
