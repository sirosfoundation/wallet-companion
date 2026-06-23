import { getMessage, getMessageGroup } from '@shared/i18n';

/**
 * Translate the page UI.
 */
export function translatePageUI(group: string = '') {
	const t = getMessageGroup(group);

	const elements = document.querySelectorAll<HTMLElement>(
		'[data-i18n-key], [data-i18n-placeholder], [data-i18n-title]',
	);

	for (const element of elements) {
		const text = element.dataset.i18nKey;
		if (text) {
			const sub = element.dataset.i18nSub ? element.dataset.i18nSub.split(',') : undefined;
			element.textContent = t(text as keyof typeof t, ...(sub || []));
		}

		const placeholder = element.dataset.i18nPlaceholder;
		if (placeholder && 'placeholder' in element) {
			element.placeholder = t(placeholder as keyof typeof t);
		}
		const title = element.dataset.i18nTitle;
		if (title) element.title = t(title as keyof typeof t);
	}
}
