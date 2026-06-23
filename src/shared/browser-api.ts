/**
 * Browser API abstraction to support both multiple browsers.
 * Provides a unified interface for accessing the browser API, whether it's the WebExtension API (for Firefox) or the Chrome Extension API.
 */
export const browserApi = (() => {
	if (typeof browser !== 'undefined' && 'runtime' in browser) {
		return browser;
	}

	if (typeof chrome !== 'undefined' && 'runtime' in chrome) {
		return chrome;
	}

	return null;
})();
