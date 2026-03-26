/**
 * Jest setup file for browser extension testing
 */

// Mock browser/chrome APIs
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    getURL: (path) => `chrome-extension://test-extension-id/${path}`,
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    openOptionsPage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn((keys) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    }
  },
  tabs: {
    executeScript: jest.fn(() => Promise.resolve()),
    query: jest.fn(() => Promise.resolve([]))
  }
};

// Also expose as browser for Firefox compatibility
global.browser = global.chrome;

// Note: jsdom provides window.location automatically, no need to mock it
// The default jsdom URL is 'about:blank' but tests can set it via testEnvironmentOptions

// Mock navigator.credentials
global.navigator.credentials = {
  get: jest.fn(() => Promise.resolve(null)),
  create: jest.fn(() => Promise.resolve(null)),
  store: jest.fn(() => Promise.resolve())
};

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Note: Do NOT mock document.createElement - jsdom provides a real implementation
// that is needed for DOM manipulation tests

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
