import { getEntryURL } from '@shared/runtime';

export function loadContentScript(url: string, onload?: (e?: Event) => void): Promise<void> {
	const name = `content-script-${crypto.randomUUID()}`;
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = getEntryURL(url);
		script.onerror = (e) => reject(new Error(`Failed to load content script: ${url}`));
		script.dataset.name = name;
		script.addEventListener(name, (e) => {
			onload?.(e);
			resolve();
		});
		(document.head || document.documentElement).appendChild(script);
	});
}
