# Inkling Lexical Test Guide

This repository contains a single package, **`@inkling/editor`**, at the repository root.

## Test Commands

### Unit Tests

```bash
pnpm test:unit          # Run unit tests once
pnpm test:unit:watch    # Run unit tests in watch mode
```

### E2E Tests (Playwright)

```bash
pnpm test:e2e           # Run E2E tests (headless, list reporter)
pnpm test:e2e:quiet     # Run E2E tests (minimal output, failures only)
pnpm test:e2e:headed    # Run E2E tests with browser UI visible
pnpm test:e2e:report    # Run E2E tests with HTML report
pnpm test:slowmo        # Run E2E tests with slow motion + UI
```

### All Tests

```bash
pnpm test               # Run unit tests (Vitest)
pnpm test:e2e           # Run E2E tests (Playwright)
pnpm typecheck          # Run TypeScript type checking
pnpm lint               # Run JavaScript/TypeScript lint
pnpm lint:css           # Run CSS lint
```

## AI-Friendly Testing

The test runner has been configured to work well with AI agents:

- **Default behavior**: Headless mode with list reporter (no browser UI, no web pages)
- **Quiet mode**: Use `pnpm test:e2e:quiet` for minimal output (only shows failures)
- **Clean exit**: Tests complete without hanging processes or opening browsers
- **Clear output**: List reporter provides clear pass/fail information

## Human-Friendly Testing

For debugging and development:

- Use `pnpm test:e2e:headed` to see the browser UI
- Use `pnpm test:e2e:report` to generate an HTML report
- Use `pnpm test:slowmo` for slow-motion debugging

## Environment Variables

- `PLAYWRIGHT_HEADED=true` - Show browser UI
- `PLAYWRIGHT_HTML_REPORT=true` - Generate HTML report
- `PLAYWRIGHT_SLOWMO=100` - Slow motion delay (ms)

## Test Structure

- `test/unit/` - Unit tests (Vitest)
- `test/e2e/` - End-to-end tests (Playwright)
- `test/utils/` - Shared test utilities
- `test/clean-basic-html/` - HTML sanitization / cleanup tests
- `test/html-renderer/` - HTML renderer tests
- `test/html-to-lexical/` - HTML-to-Lexical conversion tests
- `test/markdown/` - Markdown import/export tests
- `test/nodes-base/` - Base node behavior tests
- `test/transforms/` - Transform utility tests

## Development Workflow

1. Run unit tests during development: `pnpm test:unit:watch`
2. Run E2E tests before committing: `pnpm test:e2e`
3. Use headed mode for debugging: `pnpm test:e2e:headed`
