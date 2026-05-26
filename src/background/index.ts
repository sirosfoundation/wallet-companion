/**
 * Background script for W3C Digital Credentials API interceptor
 * Manages wallet configuration and credential requests
 */

import { runtime } from '@shared/runtime';
import { handleMessage } from './handlers';
import { Stores } from './storage';

/**
 * Initialize on install/startup.
 * Listen for messages from content scripts.
 */
runtime.onInstalled.addListener(initializeExtension);
runtime.onStartup.addListener(initializeExtension);
runtime.onMessage.addListener((message, sender, sendResponse) => {
	handleMessage(message, sender, sendResponse);
	return true; // Keep channel open for async
});

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
