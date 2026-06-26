import { defineConfig } from 'oxlint'

// Phase 0 — aligned to /Users/YufanSheng/Developer/xiaoyu/yufan.me/oxlint.config.ts
// via docs/audit/oxlint-gatekeeping-methodology.md.
//
// SKIPPED vs yufan.me (reasons):
//  - react/react-compiler      : React 18.3.1, no babel-plugin-react-compiler.
//  - oxc/no-barrel-file        : src/index.ts is a public barrel.
//  - react formComponents/linkComponents : no React Router in src (demo-only).
//  - node/no-process-env       : not a server.
//  - react/no-danger off, jsx-a11y/* off, react_perf/* off : leave unset.
//
// Inkling KEEPERS:
//  - typescript/no-unsafe-declaration-merging: warn (DecoratorNode class+interface).
//  - typescript/no-explicit-any: error (kept from prior config).
//
// NOTE: typeAware/typeCheck are omitted because oxlint-tsgolint is not installed;
// TypeScript strict checking is enforced by `npx tsc --noEmit`.
export default defineConfig({
  plugins: ['react', 'jsx-a11y', 'react-perf', 'import', 'typescript', 'promise', 'node', 'unicorn', 'oxc'],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'node_modules/**',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.pnpm/**',
    '**/*.min.js',
    'pnpm-lock.yaml',
    '**/*.html',
    'storybook-static/**',
  ],
  settings: {
    react: {
      version: '18.3.1',
    },
  },
  categories: {
    correctness: 'error',
  },
  rules: {
    // --- Inkling keepers (from prior config) ---
    eqeqeq: ['error', 'always'],
    'no-eval': 'error',
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-useless-call': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'array-callback-return': 'error',
    'no-constructor-return': 'error',
    'no-promise-executor-return': 'error',
    'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
    'typescript/no-explicit-any': 'error',
    'typescript/dot-notation': 'error',
    // Lexical DecoratorNode subclasses intentionally use class+interface merging.
    'typescript/no-unsafe-declaration-merging': 'off',
    'unicorn/no-empty-file': 'off',
    'unicorn/no-invalid-remove-event-listener': 'warn',
    'react/no-array-index-key': 'warn',
    'no-control-regex': 'off',

    // --- P0 group (suspicious / correctness, low noise) ---
    curly: 'error',
    'import/default': 'error',
    'import/no-namespace': 'error',
    'import/no-duplicates': 'error',
    'import/no-self-import': 'error',
    'import/no-webpack-loader-syntax': 'error',
    'import/no-mutable-exports': 'error',
    'import/no-empty-named-blocks': 'error',
    'promise/no-callback-in-promise': 'error',
    'promise/no-multiple-resolved': 'error',
    'promise/no-return-in-finally': 'error',
    'react/exhaustive-deps': 'warn',
    'react/rules-of-hooks': 'error',
    'react/button-has-type': 'error',
    'react/checked-requires-onchange-or-readonly': 'error',
    'react/jsx-no-comment-textnodes': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-script-url': 'error',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-children-prop': 'error',
    'react/no-danger-with-children': 'error',
    'react/no-unknown-property': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/style-prop-object': 'error',
    'react/void-dom-elements-no-children': 'error',
    'react/no-string-refs': 'error',
    'react/jsx-no-constructed-context-values': 'warn',
    'typescript/await-thenable': 'error',
    'typescript/no-array-delete': 'error',
    'typescript/no-deprecated': 'error',
    'typescript/no-floating-promises': 'error',
    'typescript/no-for-in-array': 'error',
    'typescript/no-implied-eval': 'error',
    'typescript/no-misused-promises': 'error',
    'typescript/no-namespace': 'error',
    'typescript/no-non-null-asserted-optional-chain': 'error',
    'typescript/no-require-imports': 'error',
    'typescript/no-base-to-string': 'error',
    'typescript/no-misused-spread': 'error',
    'typescript/switch-exhaustiveness-check': 'warn',
    'typescript/ban-ts-comment': 'warn',
    'typescript/no-unnecessary-template-expression': 'warn',
    'no-extend-native': 'error',
    'no-unexpected-multiline': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-commented-out-tests': 'warn',
    'no-extraneous-class': 'warn',
    'no-unnecessary-type-arguments': 'warn',
    'no-unnecessary-type-constraint': 'warn',
    'no-unsafe-enum-comparison': 'warn',
    'no-instanceof-builtins': 'warn',
    'node/no-exports-assign': 'error',
    'unicorn/error-message': 'error',
    'unicorn/throw-new-error': 'error',
    'unicorn/no-await-expression-member': 'warn',
    'unicorn/no-useless-iterator-to-array': 'warn',

    // --- Rejected by gatekeeper during triage (too noisy / architectural) ---
    'import/no-cycle': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/no-autofocus': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/no-noninteractive-element-to-interactive-role': 'off',
    'jsx-a11y/prefer-tag-over-role': 'off',
    'jsx-a11y/control-has-associated-label': 'off',
    'jsx-a11y/mouse-events-have-key-events': 'off',
    'jsx-a11y/no-noninteractive-tabindex': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'oxc/no-accumulating-spread': 'off',
    'typescript/no-unsafe-argument': 'off',
    'typescript/no-unsafe-assignment': 'off',
    'typescript/no-unsafe-call': 'off',
    'typescript/no-unsafe-member-access': 'off',
    'typescript/no-unsafe-return': 'off',
    'typescript/no-unsafe-type-assertion': 'off',
    'typescript/restrict-plus-operands': 'off',
    'typescript/no-confusing-void-expression': 'off',
    'typescript/no-unnecessary-type-assertion': 'off',
    'typescript/prefer-nullish-coalescing': 'off',
    'typescript/prefer-optional-chain': 'off',

    // --- P1 group (restriction / feature bans) ---
    'no-var': 'error',
    'no-sequences': 'error',
    'prefer-node-protocol': 'error',
    'no-param-reassign': 'warn',
    'promise/catch-or-return': 'warn',
    'no-document-cookie': 'error',
    // no-empty-function disabled: 83+ violations in stories/listener stubs — too noisy

    // --- P2 group (pedantic) ---
    'no-throw-literal': 'error',
    'no-case-declarations': 'error',
    'prefer-ts-expect-error': 'error',
    'prefer-includes': 'warn',
    'return-await': 'warn',

    // --- P3 group (perf) ---
    'prefer-array-flat-map': 'warn',
    'prefer-set-has': 'warn',

    // --- P4 group (import hygiene) ---
    'no-absolute-path': 'warn',
  },
})
