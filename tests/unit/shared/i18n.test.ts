import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getMessage } from '@shared/i18n';

describe('getMessage', () => {
	const originalChrome = globalThis.chrome;

	afterEach(() => {
		// Restore original chrome mock from setup.ts
		(globalThis as Record<string, unknown>).chrome = originalChrome;
	});

	it('returns localized string when chrome.i18n is available', () => {
		(globalThis as Record<string, unknown>).chrome = {
			i18n: { getMessage: vi.fn((_key: string) => 'Localized text') },
		};
		expect(getMessage('extName')).toBe('Localized text');
	});

	it('returns key when chrome.i18n.getMessage returns empty string', () => {
		(globalThis as Record<string, unknown>).chrome = {
			i18n: { getMessage: vi.fn(() => '') },
		};
		expect(getMessage('unknownKey')).toBe('unknownKey');
	});

	it('passes substitutions to the i18n API', () => {
		const mockGetMessage = vi.fn((_key: string, _subs?: string | string[]) => 'Icon text');
		(globalThis as Record<string, unknown>).chrome = {
			i18n: { getMessage: mockGetMessage },
		};
		getMessage('walletIconAlt', 'MyWallet');
		expect(mockGetMessage).toHaveBeenCalledWith('walletIconAlt', 'MyWallet');
	});

	it('returns key when i18n API is not available', () => {
		(globalThis as Record<string, unknown>).chrome = undefined;
		(globalThis as Record<string, unknown>).browser = undefined;
		expect(getMessage('extName')).toBe('extName');
	});
});
