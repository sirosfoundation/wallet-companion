/**
 * Background script for W3C Digital Credentials API interceptor
 * Manages wallet configuration and credential requests
 */

import { parse } from 'valibot';
import { type ContentMessage, ContentMessageSchema, Messages, ServerMessage, ServerMessageSchema } from './schemas/messages';
import type { Options } from './schemas/resources';
import { Stores } from './storage';

/**
 * Initialize extension
 */
async function initializeExtension() {
	// Initialize default settings if not exists
	const result = await Stores.options.getEnabled();

	if (result === undefined) {
		await Stores.options.setEnabled(true);
	}

	console.log('Digital Credentials API Interceptor initialized');
}

// Initialize on install/startup
if (typeof chrome !== 'undefined' && chrome.runtime) {
	chrome.runtime.onInstalled.addListener(initializeExtension);
	chrome.runtime.onStartup.addListener(initializeExtension);
}

/**
 * Get configured wallets
 */
async function getConfiguredWallets() {
	const result = await Stores.wallets.getAll();
	return result || [];
}

/**
 * Check if extension is enabled
 */
async function isExtensionEnabled() {
	const result = await Stores.options.getEnabled();
	return result !== false;
}

/**
 * Update usage statistics
 */
async function updateStats(action: string) {
	const result = await Stores.stats.getStats();
	const stats = result || { interceptCount: 0, walletUses: {} };

	if (action === 'intercept') {
		stats.interceptCount = (stats.interceptCount || 0) + 1;
	} else if (action.startsWith('wallet:')) {
		const walletId = action.substring(7);
		stats.walletUses[walletId] = (stats.walletUses[walletId] || 0) + 1;
	}

	await Stores.stats.setStats(stats);

	await sendMessage({ type: Messages.STATS_UPDATE, stats });
}

/**
 * Get all supported protocols from registered wallets
 */
async function getSupportedProtocols() {
	const wallets = await getConfiguredWallets();
	const enabledWallets = wallets.filter((w) => w.enabled);

	// Collect all unique protocols
	const protocols = new Set();
	for (const wallet of enabledWallets) {
		if (wallet.protocols && Array.isArray(wallet.protocols)) {
			wallet.protocols.forEach((p) => {
				protocols.add(p);
			});
		}
	}

	return Array.from(protocols);
}

/**
 * Get wallets that support a specific protocol
 */
async function _getWalletsForProtocol(protocol: string) {
	const wallets = await getConfiguredWallets();
	return wallets.filter(
		(w) => w.enabled && w.protocols && Array.isArray(w.protocols) && w.protocols.includes(protocol),
	);
}
type SendResponse = (response: unknown) => void;

/**
 * Send messages from content scripts to the background script.
 * Handles both Chrome and Firefox environments and gracefully
 * ignores "Could not establish connection" errors.
 */
async function sendMessage(message: ServerMessage): Promise<void> {
	message = parse(ServerMessageSchema, message);

	if (typeof browser !== 'undefined') {
		try {
			return await browser.runtime.sendMessage(message);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (!msg.includes('Could not establish connection')) {
				throw err;
			}
		}
	}

	return new Promise<void>((resolve) => {
		chrome.runtime.sendMessage(message, () => {
			if (chrome.runtime.lastError) {
				const msg = chrome.runtime.lastError.message ?? '';
				if (
					!msg.includes('Could not establish connection') &&
					!msg.includes('Receiving end does not exist')
				) {
					throw new Error(msg);
				}
			}
			resolve();
		});
	});
}

interface MessageSenderCompat {
	tab?: { id?: number };
	frameId?: number;
}

/**
 * Handle messages from content scripts
 */
async function handleMessage(
	message: ContentMessage,
	sender: MessageSenderCompat,
	sendResponse: SendResponse,
) {
	console.log('Received message:', message.type);

	message = parse(ContentMessageSchema, message) as ContentMessage;

	try {
		if (message.type === 'SHOW_WALLET_SELECTOR') {
			// Check if extension is enabled
			const enabled = await isExtensionEnabled();
			if (!enabled) {
				sendResponse({ useNative: true });
				return true;
			}

			// Update statistics
			await updateStats('intercept');

			// Get configured wallets that support the requested protocols
			const allWallets = await getConfiguredWallets();
			const enabledWallets = allWallets.filter((w) => w.enabled);

			// Filter wallets by protocols if requests specify protocols
			let matchingWallets = enabledWallets;
			if (message.requests && Array.isArray(message.requests)) {
				const requestedProtocols = message.requests.map((r) => r.protocol);
				matchingWallets = enabledWallets.filter(
					(wallet) =>
						wallet.protocols &&
						Array.isArray(wallet.protocols) &&
						wallet.protocols.some((p) => requestedProtocols.includes(p)),
				);
			}

			// If no wallets support the requested protocols, fall back to native
			if (matchingWallets.length === 0) {
				console.log('No wallets support requested protocols, using native API');
				sendResponse({ useNative: true });
				return true;
			}

			// Inject modal and show wallet selector
			await injectWalletModal(sender.tab?.id, sender.frameId);

			// Send matching wallets to content script
			sendResponse({ wallets: matchingWallets, requests: message.requests });
			return true;
		} else if (message.type === 'WALLET_SELECTED') {
			// Record wallet usage
			await updateStats(`wallet:${message.walletId}`);

			// Here you would handle the actual credential request to the wallet
			// For now, we'll just acknowledge
			sendResponse({ success: true });
			return true;
		} else if (message.type === 'GET_WALLETS') {
			const wallets = await getConfiguredWallets();
			sendResponse({ wallets });
			return true;
		} else if (message.type === 'SAVE_WALLETS') {
			await Stores.wallets.setAll(message.wallets);
			sendResponse({ success: true });
			return true;
		} else if (message.type === 'GET_SETTINGS') {
			const enabled = await Stores.options.getEnabled();
			const developerMode = await Stores.options.getDeveloperMode();
			const stats = await Stores.stats.getStats();

			sendResponse({
				enabled: enabled !== false,
				developerMode: developerMode === true,
				stats: stats || { interceptCount: 0, walletUses: {} },
			});
			return true;
		} else if (message.type === 'SAVE_SETTINGS') {
			const updates: Partial<Options> = {};

			if (typeof message.enabled === 'boolean') {
				updates.enabled = message.enabled;
			}
			if (typeof message.developerMode === 'boolean') {
				updates.developerMode = message.developerMode;
			}
			await Stores.options.updateOptions(updates);
			sendResponse({ success: true });
			return true;
		} else if (message.type === 'TOGGLE_ENABLED') {
			await Stores.options.updateOptions({ enabled: message.enabled });
			sendResponse({ success: true });
			return true;
		} else if (message.type === 'REGISTER_WALLET') {
			// Handle wallet auto-registration
			const wallets = await Stores.wallets.getAll();

			// Check if wallet already exists (by URL)
			const existingWallet = wallets.find((w) => w.url === message.wallet.url);

			if (existingWallet) {
				// Wallet already registered
				console.log('Wallet already registered:', message.wallet.url);
				sendResponse({
					success: true,
					alreadyRegistered: true,
					wallet: existingWallet,
				});
				return true;
			}

			// Generate new wallet ID
			const walletId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			// Add wallet to the list
			const newWallet = {
				...message.wallet,
				id: walletId,
				enabled: true,
				autoRegistered: true,
				registeredFrom: message.origin as string,
				registeredAt: new Date().toISOString(),
			};

			wallets.push(newWallet);
			await Stores.wallets.setAll(wallets);

			console.log('Wallet registered:', newWallet.name, 'from', message.origin);

			sendResponse({
				success: true,
				alreadyRegistered: false,
				wallet: newWallet,
			});
			return true;
		} else if (message.type === 'CHECK_WALLET') {
			// Check if a wallet is registered
			const wallets = await Stores.wallets.getAll();
			const isRegistered = wallets.some((w) => w.url === message.url);
			sendResponse({ isRegistered: isRegistered });
			return true;
		} else if (message.type === 'GET_SUPPORTED_PROTOCOLS') {
			// Get all supported protocols
			const protocols = await getSupportedProtocols();
			sendResponse({ protocols: protocols });
			return true;
		} else if (message.type === 'CONTENT_SCRIPT_READY') {
			// Content script has loaded
			console.log('Content script ready on:', message.origin);
			sendResponse({ success: true });
			return true;
		} else if (message.type === 'FETCH_FAVICON') {
			// Fetch favicon from a wallet URL via background script to avoid CORS
			try {
				const urlObj = new URL(message.url);
				const faviconUrl = `${urlObj.origin}${urlObj.pathname.replace(/\/?$/, '/')}favicon.ico`;

				const controller = new AbortController();
				const timeoutMs = message.timeout || 3000;
				const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

				const res = await fetch(faviconUrl, { signal: controller.signal });
				clearTimeout(timeoutId);

				if (!res.ok) {
					sendResponse({ success: false });
					return true;
				}

				const contentType = res.headers.get('content-type') || 'image/x-icon';
				if (!contentType.startsWith('image/')) {
					sendResponse({ success: false });
					return true;
				}

				const buf = await res.arrayBuffer();
				if (!buf.byteLength) {
					sendResponse({ success: false });
					return true;
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

				sendResponse({ success: true, dataUri });
			} catch (e) {
				console.error('Error fetching favicon:', e);
				sendResponse({ success: false });
			}
			return true;
		}
	} catch (error) {
		console.error('Error handling message:', error);
		sendResponse({ error: error instanceof Error ? error.message : String(error) });
	}

	return true; // Keep the message channel open for async responses
}

/**
 * Inject wallet modal into the page
 */
async function injectWalletModal(tabId: number | undefined, frameId?: number) {
	if (tabId === undefined) return;
	const tabs = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;

	try {
		await tabs.executeScript(tabId, {
			file: 'modal.js',
			frameId: frameId || 0,
			runAt: 'document_end',
		});
	} catch (error) {
		console.error('Failed to inject modal:', error);
	}
}

// Listen for messages from content scripts
if (typeof browser !== 'undefined') {
	browser.runtime.onMessage.addListener(handleMessage);
} else if (typeof chrome !== 'undefined') {
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		handleMessage(message, sender, sendResponse);
		return true; // Keep channel open for async
	});
}
