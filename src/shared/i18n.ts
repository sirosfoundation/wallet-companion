import elMessages from '../../_locales/el/messages.json';
import enMessages from '../../_locales/en/messages.json';
import fiMessages from '../../_locales/fi/messages.json';
import ptMessages from '../../_locales/pt_PT/messages.json';
import svMessages from '../../_locales/sv/messages.json';
import { browserApi } from './browser-api';

export type MessageKey = keyof typeof elMessages &
	keyof typeof enMessages &
	keyof typeof fiMessages &
	keyof typeof ptMessages &
	keyof typeof svMessages;

type StripKeyPrefix<P extends string, K extends string> = K extends `${P}_${infer Suffix}`
	? Suffix
	: never;

type Messages = Record<MessageKey, { message: string; description?: string }>;

type Locale = {
	label: string;
	messages: Messages;
};

type Locales = Record<string, Locale>;

export const locales = {
	el: {
		label: 'Ελληνικά',
		messages: elMessages,
	},
	en: {
		label: 'English',
		messages: enMessages,
	},
	fi: {
		label: 'Suomi',
		messages: fiMessages,
	},
	pt_PT: {
		label: 'Português (Portugal)',
		messages: ptMessages,
	},
	sv: {
		label: 'Svenska',
		messages: svMessages,
	},
} satisfies Locales;

let cachedMessages: Messages | null = null;
/**
 * Initialize i18n for page context. Call before using getMessage.
 */
export async function initPageI18n(fetchMessages: () => Promise<Messages>): Promise<void> {
  if (!cachedMessages) {
    cachedMessages = await fetchMessages();

	console.debug('i18n initialized with messages:', cachedMessages);
  }
}

/**
 * Get a localized message.
 */
export function getMessage(key: MessageKey, substitutions?: string | string[]): string {
	if (browserApi?.i18n?.getMessage) {
		return browserApi.i18n.getMessage(key, substitutions) || key;
	}

	const messages = cachedMessages;
	const msg = messages?.[key]?.message;
	if (msg) {
		let result = msg;
		if (substitutions) {
			const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
			subs.forEach((sub, i) => {
			result = result.replace(`$${i + 1}`, sub);
			});
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
