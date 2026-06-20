/**
 * Internationalization helper for browser extension messages.
 *
 * Wraps chrome.i18n.getMessage() with a fallback to the message key
 * for environments where the i18n API is not available (e.g. tests).
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
	try {
		const msg = chrome.i18n.getMessage(key, substitutions);
		return msg || key;
	} catch {
		// Fallback for environments without chrome.i18n (tests, plain page context)
		return key;
	}
}
