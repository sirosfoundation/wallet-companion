import { browserApi } from './browser-api';

export function getMessage(key: string, substitutions?: string | string[]): string {
	if (browserApi?.i18n?.getMessage) {
		const msg = browserApi.i18n.getMessage(key, substitutions);
		return msg || key;
	}

	return key;
}
