import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

const require = createRequire(import.meta.url)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svgr(), react(), tailwindcss()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0'),
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
    outDir: 'dist-demo',
    sourcemap: true,
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
  test: {
    globals: true, // required for @testing-library/jest-dom extensions
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    include: [
      './test/unit/**/*.test.{js,jsx,ts,tsx}',
      './test/utils/**/*.test.{js,jsx,ts,tsx}',
      './test/clean-basic-html/**/*.test.{js,jsx,ts,tsx}',
      './test/html-to-lexical/**/*.test.{js,jsx,ts,tsx}',
      './test/html-renderer/**/*.test.{js,jsx,ts,tsx}',
      './test/markdown/**/*.test.{js,jsx,ts,tsx}',
      './test/transforms/**/*.test.{js,jsx,ts,tsx}',
      './test/nodes-base/**/*.test.{js,jsx,ts,tsx}',
      './test/unsplash/unit/**/*.test.{js,jsx,ts,tsx}',
    ],
    testTimeout: 10000,
    ...(process.env.CI && {
      // https://github.com/vitest-dev/vitest/issues/1674
      minThreads: 1,
      maxThreads: 2,
    }),
  },
})
