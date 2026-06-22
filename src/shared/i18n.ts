/**
 * Internationalization helper for browser extension messages.
 *
 * Uses the WebExtension i18n API when available, with a fallback to the
 * message key for environments where the API is not present (e.g. tests).
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
	const g = globalThis as Record<string, unknown>;
	const chromeApi = (g.chrome as { i18n?: { getMessage: (k: string, s?: string | string[]) => string } })?.i18n;
	const browserApi = (g.browser as { i18n?: { getMessage: (k: string, s?: string | string[]) => string } })?.i18n;
	const api = chromeApi ?? browserApi;
	if (api?.getMessage) {
		const msg = api.getMessage(key, substitutions);
		return msg || key;
	}
	// Fallback for environments without i18n API (tests, plain page context)
	return key;
}
