import { generateInitialAvatar, svgToDataUrl } from '@shared/icons';
import { logger } from '@shared/logger';
import type { WalletRegistrationInput } from '@shared/schemas/resources';

/**
 * Parses a wallet icon from various formats (data URI, SVG string, remote URL) and returns a data URI.
 * If the icon is invalid or cannot be fetched, generates a fallback identicon based on the wallet name.
 */
export async function parseWalletIcon(
	icon: string | null | undefined,
	wallet: WalletRegistrationInput,
): Promise<string> {
	if (icon?.startsWith('data:')) {
		return icon;
	}

	if (icon?.startsWith('<svg')) {
		return svgToDataUrl(icon);
	}

	if (icon?.startsWith('http://') || icon?.startsWith('https://')) {
		return await fetchRemoteIconDataUri(icon);
	}

	// generate identicon based on URL (fallback if no valid icon provided)
	try {
		const identifier = wallet.name || 'wallet';
		const svg = generateInitialAvatar(identifier);
		return svgToDataUrl(svg);
	} catch (e) {
		logger.error('Icon generation failed:', e);
		throw new Error('Failed to generate wallet icon');
	}
}

/**
 * Fetches the favicon from the given URL and returns it as a data URI.
 */
export async function fetchRemoteIconDataUri(
	url: string,
	timeoutMs: number = 3000,
): Promise<string> {
	const urlObj = new URL(url);
	const faviconUrl = `${urlObj.origin}${urlObj.pathname.replace(/\/?$/, '/')}favicon.ico`;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const res = await fetch(faviconUrl, { signal: controller.signal });
	clearTimeout(timeoutId);

	if (!res.ok) {
		throw new Error(`Failed to fetch icon: ${res.status} ${res.statusText}`);
	}

	const contentType = res.headers.get('content-type') || 'image/x-icon';
	if (!contentType.startsWith('image/')) {
		throw new Error(`Invalid icon content type: ${contentType}`);
	}

	const buf = await res.arrayBuffer();
	if (!buf.byteLength) {
		throw new Error('Fetched icon is empty');
	}

	// Convert ArrayBuffer to base64 data URI
	// (Service workers in MV3 lack FileReader/btoa for binary)
	const bytes = new Uint8Array(buf);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	const base64 = btoa(binary);
	const dataUri = `data:${contentType};base64,${base64}`;

	return dataUri;
}
