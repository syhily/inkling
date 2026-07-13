import 'dotenv/config'
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'
import { defineConfig, esmExternalRequirePlugin, loadEnv } from 'vite'
import svgr from 'vite-plugin-svgr'

import pkg from './package.json'

const require = createRequire(import.meta.url)

const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  process.env = { ...process.env, ...env }

  const plugins = [
    svgr(),
    react(),
    tailwindcss(),
    mdx(),
    // Convert CJS require("react")/require("react-dom") calls inside
    // bundled dependencies to ESM imports so the ESM build has no
    // runtime require() shims that break in browsers
    esmExternalRequirePlugin({
      external: [/^react($|\/)/, /^react-dom($|\/)/],
      skipDuplicateCheck: true,
    }),
  ]

  return defineConfig({
    plugins,
    server: {
      // Allow access from the Docker dev environment (host.docker.internal)
      allowedHosts: true,
    },
    preview: {
      // Allow access from the Docker dev environment (host.docker.internal)
      allowedHosts: true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.VITEST_SEGFAULT_RETRY': 3,
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@/': resolve(import.meta.dirname, 'src') + sep,
        '#/': resolve(import.meta.dirname, 'test') + sep,
        // markdown-it-image-lazy-loading → image-size → queue depends on
        // Node's events module. Provide a browser-compatible EventEmitter
        // so Vite does not replace it with an empty browser-external proxy.
        events: require.resolve('eventemitter3'),
        // required to prevent double-bundling of yjs due to cjs/esm mismatch
        // (see https://github.com/facebook/lexical/issues/2153)
        yjs: require.resolve('yjs/src/index.js'),
      },
    },
    build: {
      minify: true,
      sourcemap: true,
      cssCodeSplit: true,
      lib: {
        entry: resolve(import.meta.dirname, 'src/index.ts'),
        name: pkg.name,
        fileName(format: string) {
          if (format === 'umd') {
            return `${outputFileName}.umd.js`
          }

          return `${outputFileName}.js`
        },
      },
      rolldownOptions: {
        // Suppress upstream Lexical/Rolldown INVALID_ANNOTATION warnings that
        // originate from @lexical/react's pre-minified prod.mjs files. The
        // annotation position is controlled by Meta's build tooling, not us.
        checks: {
          invalidAnnotation: false,
        },
        external: [
          /^markdown-it/,
          /^@uiw\/react-codemirror/,
          /^@uiw\/codemirror-extensions-basic-setup/,
          /^@codemirror\//,
          /^emoji-mart/,
          /^@emoji-mart\//,
          'fast-average-color',
        ],
        output: {
          globals: function (id: string) {
            // Provide explicit global names for optional peer dependencies
            // that are externalized from the UMD build.
            const globals: Record<string, string> = {
              react: 'React',
              'react/jsx-runtime': 'React',
              'react-dom': 'ReactDOM',
              'react-dom/client': 'ReactDOM',
              'markdown-it': 'markdownit',
              'markdown-it-footnote': 'markdownitFootnote',
              'markdown-it-image-lazy-loading': 'markdownitImageLazyLoading',
              'markdown-it-lazy-headers': 'markdownitLazyHeaders',
              'markdown-it-mark': 'markdownitMark',
              'markdown-it-sub': 'markdownitSub',
              'markdown-it-sup': 'markdownitSup',
              'emoji-mart': 'EmojiMart',
              '@emoji-mart/data': 'EmojiMartData',
              '@emoji-mart/react': 'EmojiMartReact',
              'fast-average-color': 'FastAverageColor',
              '@uiw/react-codemirror': 'UIWReactCodemirror',
              '@uiw/codemirror-extensions-basic-setup': 'UIWCodemirrorExtensionsBasicSetup',
              '@codemirror/autocomplete': 'CMAutocomplete',
              '@codemirror/commands': 'CMCommands',
              '@codemirror/lang-css': 'CMLangCss',
              '@codemirror/lang-html': 'CMLangHtml',
              '@codemirror/lang-javascript': 'CMLangJavascript',
              '@codemirror/language': 'CMLanguage',
              '@codemirror/view': 'CMView',
            }
            if (id in globals) {
              return globals[id]
            }
            // Fallback to a best-effort global name; this keeps the build
            // deterministic even if a new external is added.
            return id.replace(/^@/, '').replace(/\//g, '_').replace(/-/g, '_')
          },
          assetFileNames: (assetInfo: { names?: string[] }) => {
            // Vite 6 changed CSS output naming in lib mode from
            // 'style.css' to deriving from the entry filename.
            // Preserve 'style.css' for backwards compatibility.
            if (assetInfo.names?.[0]?.endsWith('.css')) {
              return 'style.css'
            }
            return assetInfo.names?.[0] ?? '[name][extname]'
          },
        },
      },
    },
    test: {
      globals: true, // required for @testing-library/jest-dom extensions
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      include: ['./test/unit/**/*.test.{js,jsx,ts,tsx}'],
      testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
      ...(process.env.CI && {
        // https://github.com/vitest-dev/vitest/issues/1674
        minThreads: 1,
        maxThreads: 2,
      }),
    },
  })
})
