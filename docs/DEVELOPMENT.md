# Development Guide

This guide covers setup, build, testing, and packaging for Wallet Companion.

## Prerequisites

- Node.js 22 or newer
- pnpm 10.4.0
- Browser requirements:
  - Chrome for Chrome extension testing
  - Firefox for Firefox extension testing
  - Safari on macOS with Xcode for Safari extension testing

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Build extensions:

```bash
# Build all browsers
pnpm build

# Build specific browser
pnpm build:chrome
pnpm build:firefox
pnpm build:safari
```

## Development Workflow

Use watch mode during development:

```bash
# Default watch target
pnpm watch

# Browser-specific watch targets
pnpm watch:chrome
pnpm watch:firefox
pnpm watch:safari
```

## Load In Browser

### Chrome

1. Open chrome://extensions/
2. Enable Developer mode
3. Click Load unpacked
4. Select dist/chrome

### Firefox

1. Open about:debugging#/runtime/this-firefox
2. Click Load Temporary Add-on
3. Select dist/firefox/manifest.json

Optional dev runner:

```bash
pnpm dev:firefox
```

### Safari

1. Build Safari output:

```bash
pnpm build:safari
```

2. Convert extension bundle:

```bash
xcrun safari-web-extension-converter dist/safari/ --app-name "Wallet Companion"
```

3. Open generated Xcode project and run

## Testing

Run tests by suite:

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# End-to-end tests
pnpm test:e2e

# Full pipeline
pnpm test:all

# Coverage
pnpm test:coverage
```

### Test Fixtures

Serve local fixture pages for manual checks:

```bash
pnpm test:server
```

Then open:

- http://127.0.0.1:3456/
- http://127.0.0.1:3456/mock-wallet.html
- http://127.0.0.1:3456/mock-verifier.html

## Packaging

```bash
# Chrome package
pnpm package:chrome

# Firefox package
pnpm package:firefox

# Package both (Makefile)
make package
```

Output artifacts:

- dist/chrome-extension.zip
- dist/firefox-extension.xpi

## Makefile Commands

Common alternatives to pnpm scripts:

```bash
make build
make build-chrome
make build-firefox
make build-safari
make watch-chrome
make watch-firefox
make watch-safari
make test
make test-all
make package
make clean
```

## Project Pointers

- Runtime protocols: src/shared/protocols.ts
- Extension manifests: manifests/index.ts
- Background runtime: src/background/
- Content and injected scripts: src/content/
- UI pages: src/ui/
- Tests: tests/

## Contributing

1. Create a feature branch
2. Add or update tests for changed behavior
3. Run pnpm test:all
4. Open a pull request with a clear change summary
