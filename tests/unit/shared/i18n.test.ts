import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import type { MessageKey } from '@shared/i18n';

// Mock the browser-api module before importing i18n
const mockGetMessage = vi.fn();
vi.mock('@shared/browser-api', () => ({
	browserApi: {
		i18n: { getMessage: mockGetMessage },
		runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) },
	},
}));

// Import after mocking
const { getMessage, getMessageGroup } = await import('@shared/i18n');

describe('initI18n', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('calls fetchMessagesFn when browserApi is not available', async () => {
		vi.doMock('@shared/browser-api', () => ({ browserApi: null }));
		const { initI18n: initFn } = await import('@shared/i18n');

		const fetchFn = vi.fn().mockResolvedValue({
			extName: { message: 'Test Extension' },
		});

		await initFn(fetchFn);

		expect(fetchFn).toHaveBeenCalledOnce();
	});

	it('does not call fetchMessagesFn if already initialized', async () => {
		vi.doMock('@shared/browser-api', () => ({ browserApi: null }));
		const { initI18n: initFn } = await import('@shared/i18n');

		const fetchFn1 = vi.fn().mockResolvedValue({ key1: { message: 'First' } });
		const fetchFn2 = vi.fn().mockResolvedValue({ key2: { message: 'Second' } });

		await initFn(fetchFn1);
		await initFn(fetchFn2);

		expect(fetchFn1).toHaveBeenCalledOnce();
		expect(fetchFn2).not.toHaveBeenCalled();
	});

	it('fetches messages via getAllMessages when browserApi is available', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: () => Promise.resolve({ extName: { message: 'Fetched' } }),
		});
		vi.stubGlobal('fetch', mockFetch);

		vi.doMock('@shared/browser-api', () => ({
			browserApi: {
				i18n: {
					getMessage: vi.fn(),
					getUILanguage: () => 'en-US',
				},
				runtime: {
					getURL: (path: string) => `chrome-extension://test/${path}`,
				},
			},
		}));

		const { initI18n: initFn } = await import('@shared/i18n');
		const fetchFn = vi.fn();

		await initFn(fetchFn);

		// fetchMessagesFn should NOT be called when browserApi exists
		expect(fetchFn).not.toHaveBeenCalled();
		// Instead, fetch should be called to get locale messages
		expect(mockFetch).toHaveBeenCalledWith('chrome-extension://test/_locales/en/messages.json');

		vi.unstubAllGlobals();
	});

	it('makes stored messages available to getMessage after init', async () => {
		vi.doMock('@shared/browser-api', () => ({ browserApi: null }));
		const { initI18n: initFn, getMessage: getMsg } = await import('@shared/i18n');

		await initFn(async () => ({
			greeting: { message: 'Hello!' },
			farewell: { message: 'Goodbye!' },
		}) as never);

		expect(getMsg('greeting' as MessageKey)).toBe('Hello!');
		expect(getMsg('farewell' as MessageKey)).toBe('Goodbye!');
	});
});

describe('getMessage', () => {
	beforeEach(() => {
		mockGetMessage.mockReset();
	});

	it('returns localized string from browser API', () => {
		mockGetMessage.mockReturnValue('Localized text');
		// @ts-expect-error
		expect(getMessage('extName')).toBe('Localized text');
		expect(mockGetMessage).toHaveBeenCalledWith('extName', undefined);
	});

	it('returns key when browser API returns empty string', () => {
		mockGetMessage.mockReturnValue('');
		// @ts-expect-error
		expect(getMessage('extName')).toBe('extName');
	});

	it('passes substitutions to browser API', () => {
		mockGetMessage.mockReturnValue('Icon text');
		getMessage('walletIconAlt' as MessageKey, 'MyWallet');
		expect(mockGetMessage).toHaveBeenCalledWith('walletIconAlt', 'MyWallet');
	});

	it('passes array substitutions to browser API', () => {
		mockGetMessage.mockReturnValue('Multiple subs');
		// @ts-expect-error
		getMessage('extName', ['sub1', 'sub2']);
		expect(mockGetMessage).toHaveBeenCalledWith('extName', ['sub1', 'sub2']);
	});
});

describe('getMessageGroup', () => {
	beforeEach(() => {
		mockGetMessage.mockReset();
	});

	it('creates prefixed getMessage function', () => {
		mockGetMessage.mockReturnValue('Prefixed message');
		const getGroupMessage = getMessageGroup('popup');
		const result = getGroupMessage('title' as never);
		expect(mockGetMessage).toHaveBeenCalledWith('popup_title', undefined);
		expect(result).toBe('Prefixed message');
	});

	it('passes substitutions through prefixed function', () => {
		mockGetMessage.mockReturnValue('With subs');
		const getGroupMessage = getMessageGroup('popup');
		getGroupMessage('title' as never, 'sub');
		expect(mockGetMessage).toHaveBeenCalledWith('popup_title', 'sub');
	});
});

describe('getMessage without browserApi', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('returns key when no browserApi and no stored messages', async () => {
		vi.doMock('@shared/browser-api', () => ({ browserApi: null }));
		const { getMessage: getMessageNoBrowser } = await import('@shared/i18n');
		// @ts-expect-error
		expect(getMessageNoBrowser('extName')).toBe('extName');
	});

	it('uses stored messages with substitution replacement', async () => {
		vi.doMock('@shared/browser-api', () => ({ browserApi: null }));
		const { getMessage: getMsg, initI18n: initFn } = await import('@shared/i18n');

		await initFn(async () => ({
			testKey: { message: 'Hello $1!' },
		}) as never);

		expect(getMsg('testKey' as MessageKey, 'World')).toBe('Hello World!');
	});

	it('replaces multiple substitutions in order', async () => {
		vi.doMock('@shared/browser-api', () => ({ browserApi: null }));
		const { getMessage: getMsg, initI18n: initFn } = await import('@shared/i18n');

		await initFn(async () => ({
			multiSub: { message: '$1 and $2' },
		}) as never);

		expect(getMsg('multiSub' as MessageKey, ['First', 'Second'])).toBe('First and Second');
	});
});

describe('getAllMessages', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('fetches messages for current UI language', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			json: () => Promise.resolve({ extName: { message: 'Swedish' } }),
		});
		vi.stubGlobal('fetch', mockFetch);

		vi.doMock('@shared/browser-api', () => ({
			browserApi: {
				i18n: { getUILanguage: () => 'sv-SE' },
				runtime: { getURL: (path: string) => `moz-extension://test/${path}` },
			},
		}));

		const { getAllMessages } = await import('@shared/i18n');
		const messages = await getAllMessages();

		expect(mockFetch).toHaveBeenCalledWith('moz-extension://test/_locales/sv/messages.json');
		expect(messages).toEqual({ extName: { message: 'Swedish' } });

		vi.unstubAllGlobals();
	});

	it('falls back to English when locale fetch fails', async () => {
		const mockFetch = vi.fn()
			.mockRejectedValueOnce(new Error('Not found'))
			.mockResolvedValueOnce({
				json: () => Promise.resolve({ extName: { message: 'English fallback' } }),
			});
		vi.stubGlobal('fetch', mockFetch);

		vi.doMock('@shared/browser-api', () => ({
			browserApi: {
				i18n: { getUILanguage: () => 'de-DE' },
				runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
			},
		}));

		const { getAllMessages } = await import('@shared/i18n');
		const messages = await getAllMessages();

		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(mockFetch).toHaveBeenNthCalledWith(1, 'chrome-extension://test/_locales/de/messages.json');
		expect(mockFetch).toHaveBeenNthCalledWith(2, 'chrome-extension://test/_locales/en/messages.json');
		expect(messages).toEqual({ extName: { message: 'English fallback' } });

		vi.unstubAllGlobals();
	});

	it('throws when browserApi is not available', async () => {
		vi.doMock('@shared/browser-api', () => ({ browserApi: null }));

		const { getAllMessages } = await import('@shared/i18n');

		await expect(getAllMessages()).rejects.toThrow('No browserApi available');
	});
});
