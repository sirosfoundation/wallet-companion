/**
 * Vitest setup file for browser extension testing
 */

import { vi, beforeEach, type Mock } from 'vitest';

// Type definitions for Chrome/Browser mock APIs
type StorageData = Record<string, unknown>;
type MockFn = Mock;

interface MockStorage {
	local: {
		get: MockFn;
		set: MockFn;
		remove: MockFn;
		clear: MockFn;
	};
}

interface MockRuntime {
	id: string;
	getURL: MockFn;
	sendMessage: MockFn;
	onMessage: {
		addListener: MockFn;
		removeListener: MockFn;
	};
	onInstalled: {
		addListener: MockFn;
	};
	onStartup: {
		addListener: MockFn;
	};
	openOptionsPage: MockFn;
}

interface MockTabs {
	executeScript: MockFn;
	query: MockFn;
}

interface MockChrome {
	runtime: MockRuntime;
	storage: MockStorage;
	tabs: MockTabs;
}

// Mock browser/chrome APIs
const mockChrome: MockChrome = {
	runtime: {
		id: 'test-extension-id',
		getURL: vi.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
		sendMessage: vi.fn((_message: unknown, callback?: (response: unknown) => void) => {
			if (callback) callback({ success: true });
			return Promise.resolve({ success: true });
		}),
		onMessage: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
		},
		onInstalled: {
			addListener: vi.fn(),
		},
		onStartup: {
			addListener: vi.fn(),
		},
		openOptionsPage: vi.fn(),
	},
	storage: {
		local: {
			get: vi.fn((_keys: string | string[] | null) => Promise.resolve({})),
			set: vi.fn(() => Promise.resolve()),
			remove: vi.fn(() => Promise.resolve()),
			clear: vi.fn(() => Promise.resolve()),
		},
	},
	tabs: {
		executeScript: vi.fn(() => Promise.resolve()),
		query: vi.fn(() => Promise.resolve([])),
	},
};

// Set up global chrome and browser objects for tests
// Use type assertion since we're providing a minimal mock
(globalThis as unknown as { chrome: MockChrome }).chrome = mockChrome;

// Also expose as browser for Firefox compatibility
(globalThis as unknown as { browser: MockChrome }).browser = mockChrome;

// Note: jsdom provides window.location automatically, no need to mock it
// The default jsdom URL is 'about:blank' but tests can set it via testEnvironmentOptions

// Mock navigator.credentials
Object.defineProperty(globalThis.navigator, 'credentials', {
	value: {
		get: vi.fn(() => Promise.resolve(null)),
		create: vi.fn(() => Promise.resolve(null)),
		store: vi.fn(() => Promise.resolve()),
	},
	writable: true,
});

// Mock console methods to reduce test output noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Note: Do NOT mock document.createElement - jsdom provides a real implementation
// that is needed for DOM manipulation tests

// Reset mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
});
