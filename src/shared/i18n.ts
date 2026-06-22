import { browserApi } from './browser-api';
import elMessages from '../../_locales/el/messages.json';
import enMessages from '../../_locales/en/messages.json';
import fiMessages from '../../_locales/fi/messages.json';
import ptMessages from '../../_locales/pt_PT/messages.json';
import svMessages from '../../_locales/sv/messages.json';

export type MessageKey =
	& keyof typeof elMessages
	& keyof typeof enMessages
	& keyof typeof fiMessages
	& keyof typeof ptMessages
	& keyof typeof svMessages;

type StripKeyPrefix<P extends string, K extends string> = K extends `${P}_${infer Suffix}` ? Suffix : never;

type Locale = {
	label: string;
	messages: Record<
		MessageKey,
		{
			message: string;
			description?: string;
		}
	>;
};

type Locales = Record<string, Locale>;

const locales = {
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
} satisfies Locales ;

/**
 * Retrieves a localized message based on the provided key and optional substitutions.
 *
 * Can be used in both content scripts and extension pages, falling back to
 * the appropriate method of accessing localization data depending on the context.
 */
export function getMessage(key: MessageKey, substitutions?: string | string[]): string {
	if (browserApi?.i18n?.getMessage) {
		const msg = browserApi.i18n.getMessage(key, substitutions);
		return msg || key;
	}

	if (typeof navigator !== 'undefined') {
		const lang = navigator.language.split('-')[0] as keyof typeof locales;

		const locale = locales[lang] ?? locales.en;

		return locale.messages[key]?.message || key;
	}

	return key;
}

/**
 * Creates a function for retrieving localized messages with a common prefix.
 */
export function getMessageGroup<P extends string>(prefix: P) {
	return <K extends StripKeyPrefix<P, MessageKey>>(
		key: K,
		substitutions?: string | string[]
	): string => {
		const fullKey = `${prefix}_${key}` as MessageKey;
		return getMessage(fullKey, substitutions);
	};
}
