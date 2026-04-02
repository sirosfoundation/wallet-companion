/**
 * Content script for W3C Digital Credentials API interceptor
 * Intercepts navigator.credentials.get calls and provides wallet selection
 */

console.log('W3C Digital Credentials API Interceptor loaded');

// Inject modal script (UI for wallet selection)
const modalScript = document.createElement('script');
modalScript.src = chrome.runtime.getURL('content/modal.js');
modalScript.type = 'module';
modalScript.onload = function () {
	// After modal is loaded, inject the main interception script
	const script = document.createElement('script');
	script.src = chrome.runtime.getURL('content/inject.js');
	script.type = 'module';
	script.onload = function () {
		this.remove();
	};
	(document.head || document.documentElement).appendChild(script);
	this.remove();
};
(document.head || document.documentElement).appendChild(modalScript);

// Listen for credential requests from the injected script
window.addEventListener('DC_CREDENTIALS_REQUEST', async (event) => {
	console.log('Digital Credentials API call intercepted:', event.detail);

	const { requestId, requests, options } = event.detail;

	try {
		// Get configured wallets from background script
		const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

		// Request wallet selector (pass the processed requests with protocols)
		const response = await runtime.sendMessage({
			type: 'SHOW_WALLET_SELECTOR',
			requestId: requestId,
			requests: requests,
			options: options,
			origin: window.location.origin,
		});

		if (response.useNative) {
			window.dispatchEvent(
				new CustomEvent('DC_CREDENTIALS_RESPONSE', {
					detail: {
						requestId: requestId,
						useNative: true,
					},
				}),
			);
			return;
		}

		// Show wallet selection modal by dispatching event to the page context
		window.dispatchEvent(
			new CustomEvent('DC_SHOW_WALLET_SELECTOR', {
				detail: {
					requestId: requestId,
					wallets: response.wallets,
					requests: requests,
				},
			}),
		);
	} catch (error) {
		console.error('Error handling credential request:', error);

		window.dispatchEvent(
			new CustomEvent('DC_CREDENTIALS_RESPONSE', {
				detail: {
					requestId: requestId,
					error: error.message,
				},
			}),
		);
	}
});

// Listen for wallet selection from the page context (modal.js)
window.addEventListener('DC_WALLET_SELECTED', async (event) => {
	console.log('Wallet selected from modal:', event.detail);
	const { requestId, walletId, wallet, protocol, selectedRequest } = event.detail;

	try {
		const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

		await runtime.sendMessage({
			type: 'WALLET_SELECTED',
			walletId: walletId,
			requestId: requestId,
			protocol: protocol,
		});

		window.dispatchEvent(
			new CustomEvent('DC_INVOKE_WALLET', {
				detail: {
					requestId: requestId,
					wallet: wallet,
					protocol: protocol,
					request: selectedRequest,
				},
			}),
		);
	} catch (error) {
		console.error('Error handling wallet selection:', error);
		window.dispatchEvent(
			new CustomEvent('DC_CREDENTIALS_RESPONSE', {
				detail: {
					requestId: requestId,
					error: error.message,
				},
			}),
		);
	}
});

// Listen for wallet registration requests
window.addEventListener('DC_WALLET_REGISTRATION_REQUEST', async (event) => {
	console.log('Wallet registration request:', event.detail);

	const { registrationId, wallet } = event.detail;

	try {
		const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

		const response = await runtime.sendMessage({
			type: 'REGISTER_WALLET',
			wallet: wallet,
			origin: window.location.origin,
		});

		window.dispatchEvent(
			new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
				detail: {
					registrationId: registrationId,
					success: response.success,
					alreadyRegistered: response.alreadyRegistered,
					wallet: response.wallet,
					error: response.error,
				},
			}),
		);
	} catch (error) {
		console.error('Error handling wallet registration:', error);

		window.dispatchEvent(
			new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
				detail: {
					registrationId: registrationId,
					success: false,
					error: error.message,
				},
			}),
		);
	}
});

// Listen for wallet check requests
window.addEventListener('DC_WALLET_CHECK_REQUEST', async (event) => {
	console.log('Wallet check request:', event.detail);

	const { checkId, url } = event.detail;

	try {
		const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

		const response = await runtime.sendMessage({
			type: 'CHECK_WALLET',
			url: url,
		});

		window.dispatchEvent(
			new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
				detail: {
					checkId: checkId,
					isRegistered: response.isRegistered,
				},
			}),
		);
	} catch (error) {
		console.error('Error checking wallet:', error);

		window.dispatchEvent(
			new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
				detail: {
					checkId: checkId,
					isRegistered: false,
				},
			}),
		);
	}
});

// Listen for protocol update requests
window.addEventListener('DC_PROTOCOLS_UPDATE_REQUEST', async (event) => {
	console.log('Protocols update request:', event.detail);

	const { updateId } = event.detail;

	try {
		const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

		const response = await runtime.sendMessage({
			type: 'GET_SUPPORTED_PROTOCOLS',
		});

		window.dispatchEvent(
			new CustomEvent('DC_PROTOCOLS_UPDATE_RESPONSE', {
				detail: {
					updateId: updateId,
					protocols: response.protocols,
				},
			}),
		);
	} catch (error) {
		console.error('Error getting supported protocols:', error);

		window.dispatchEvent(
			new CustomEvent('DC_PROTOCOLS_UPDATE_RESPONSE', {
				detail: {
					updateId: updateId,
					protocols: [],
				},
			}),
		);
	}
});

// Notify extension that content script is ready
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
runtime
	.sendMessage({
		type: 'CONTENT_SCRIPT_READY',
		origin: window.location.origin,
		timestamp: Date.now(),
	})
	.catch((_err) => {
		// Ignore errors if background script isn't ready
	});
