/**
 * Vitest setup file for browser extension testing
 */

import { vi, beforeEach } from 'vitest';

// Mock browser/chrome APIs
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    getURL: (path) => `chrome-extension://test-extension-id/${path}`,
    sendMessage: vi.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onInstalled: {
      addListener: vi.fn()
    },
    onStartup: {
      addListener: vi.fn()
    },
    openOptionsPage: vi.fn()
  },
  storage: {
    local: {
      get: vi.fn((keys) => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve())
    }
  },
  tabs: {
    executeScript: vi.fn(() => Promise.resolve()),
    query: vi.fn(() => Promise.resolve([]))
  }
};

// Also expose as browser for Firefox compatibility
global.browser = global.chrome;

// Note: jsdom provides window.location automatically, no need to mock it
// The default jsdom URL is 'about:blank' but tests can set it via testEnvironmentOptions

// Mock navigator.credentials
global.navigator.credentials = {
  get: vi.fn(() => Promise.resolve(null)),
  create: vi.fn(() => Promise.resolve(null)),
  store: vi.fn(() => Promise.resolve())
};

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Note: Do NOT mock document.createElement - jsdom provides a real implementation
// that is needed for DOM manipulation tests

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
