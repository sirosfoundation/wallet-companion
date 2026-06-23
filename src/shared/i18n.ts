import { browserApi } from './browser-api';

type StripKeyPrefix<P extends string, K extends string> = K extends `${P}_${infer Suffix}`
	? Suffix
	: never;

export type MessageKey = keyof typeof import('../../_locales/en/messages.json');

export type Messages = Record<MessageKey, { message: string; description?: string }>;

export type Locale = {
	label: string;
	messages: Messages;
};

export type Locales = Record<string, Locale>;

let storedMessages: Messages | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize i18n by storing messages locally.
 * Primarily intended for page contexts where {@link browserApi} is not available.
 */
export async function initI18n(fetchMessagesFn: () => Promise<Messages>): Promise<void> {
    if (storedMessages) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (browserApi) {
            storedMessages = await getAllMessages();
        } else {
            storedMessages = await fetchMessagesFn();
        }
    })();

    return initPromise;
}

/**
 * Ensures that i18n has been initialized before proceeding.
 * Primarily intended for page contexts where {@link browserApi} is not available.
 */
export function waitForI18n(): Promise<void> {
	return initPromise ?? Promise.resolve();
}

/**
 * Get a localized message.
 */
export function getMessage(key: MessageKey, substitutions?: string | string[]): string {
	if (browserApi?.i18n?.getMessage) {
		const res = browserApi.i18n.getMessage(key, substitutions);
		if (res) return res;
	}

	const msg = storedMessages?.[key]?.message;
	if (msg) {
		let result = msg;
		if (substitutions) {
			const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
			for (const [i, sub] of subs.entries()) {
				result = result.replace(`$${i + 1}`, sub);
			}
		}
		return result;
	}

	return key;
}

/**
 * Create a prefixed getMessage function.
 */
export function getMessageGroup<P extends string>(prefix: P) {
	return <K extends StripKeyPrefix<P, MessageKey>>(
		key: K,
		substitutions?: string | string[],
	): string => {
		return getMessage(`${prefix}_${key}` as MessageKey, substitutions);
	};
}

/**
 * Get all messages for the current locale (set by the browser).
 * Intended for content script contexts where {@link browserApi} is available.
 */
export async function getAllMessages(): Promise<Messages | null> {
	if (!browserApi) throw new Error('No browserApi available');

	const lang = browserApi.i18n.getUILanguage()?.split('-')[0] ?? 'en';
	const url = browserApi.runtime.getURL(`_locales/${lang}/messages.json`);

	try {
		const res = await fetch(url);
		return res.json();
	} catch {
		const fallback = browserApi.runtime.getURL('_locales/en/messages.json');
		return (await fetch(fallback)).json();
	}
}
