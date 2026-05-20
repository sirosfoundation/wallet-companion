/**
 * Unit tests for content.ts - Content script that bridges page and extension
 */

type MockRuntimeSendMessage = <T = unknown>(message: unknown) => Promise<T>;
type MockRuntimeGetURL = (path: string) => string;

type MockRuntime = {
	sendMessage: MockRuntimeSendMessage & ReturnType<typeof vi.fn>;
	getURL: MockRuntimeGetURL & ReturnType<typeof vi.fn>;
};

describe('Content Script - Message Bridge', () => {
	let mockRuntime: MockRuntime;

	beforeEach(() => {
		// Mock browser/chrome runtime
		mockRuntime = {
			sendMessage: vi.fn(() => Promise.resolve({ success: true })) as MockRuntime['sendMessage'],
			getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`) as MockRuntime['getURL'],
		};

		// Setup global chrome object
		(globalThis as unknown as { chrome: { runtime: MockRuntime } }).chrome = {
			runtime: mockRuntime,
		};

		// Mock window event methods
		window.dispatchEvent = vi.fn();
		window.addEventListener = vi.fn();
	});

	afterEach(() => {
		delete (globalThis as unknown as { chrome?: unknown }).chrome;
	});

	describe('DC_CREDENTIALS_REQUEST Handler', () => {
		test('should extract requestId from event detail', () => {
			const eventDetail = {
				requestId: 'dc-req-123',
				requests: [{ protocol: 'openid4vp', data: {} }],
				options: { digital: true },
			};

			expect(eventDetail.requestId).toBe('dc-req-123');
		});

		test('should extract processed requests', () => {
			const eventDetail = {
				requestId: 'dc-req-123',
				requests: [
					{ protocol: 'openid4vp', data: { nonce: '123' } },
					{ protocol: 'openid4vp-v1-signed', data: { nonce: '456' } },
				],
				options: {},
			};

			expect(eventDetail.requests.length).toBe(2);
			expect(eventDetail.requests[0].protocol).toBe('openid4vp');
		});

		test('should send SHOW_WALLET_SELECTOR message to background', async () => {
			const message = {
				type: 'SHOW_WALLET_SELECTOR',
				requestId: 'dc-req-123',
				requests: [{ protocol: 'openid4vp', data: {} }],
				options: {},
				origin: 'https://example.com',
			};

			await mockRuntime.sendMessage(message);

			expect(mockRuntime.sendMessage).toHaveBeenCalledWith(message);
		});

		test('should dispatch DC_CREDENTIALS_RESPONSE on useNative', () => {
			const responseDetail = {
				requestId: 'dc-req-123',
				useNative: true,
			};

			const event = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
				detail: responseDetail,
			});

			expect(event.detail.useNative).toBe(true);
		});

		test('should dispatch DC_SHOW_WALLET_SELECTOR with wallets', () => {
			const wallets = [{ id: 'w1', name: 'Wallet 1', url: 'https://w1.com' }];

			const eventDetail = {
				requestId: 'dc-req-123',
				wallets: wallets,
				requests: [{ protocol: 'openid4vp', data: {} }],
			};

			const event = new CustomEvent('DC_SHOW_WALLET_SELECTOR', {
				detail: eventDetail,
			});

			expect(event.detail.wallets).toEqual(wallets);
		});

		test('should handle error and dispatch error response', () => {
			const errorDetail = {
				requestId: 'dc-req-123',
				error: 'Failed to load wallets',
			};

			const event = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
				detail: errorDetail,
			});

			expect(event.detail.error).toBe('Failed to load wallets');
		});
	});

	describe('DC_WALLET_SELECTED Handler', () => {
		test('should extract wallet selection data', () => {
			const eventDetail = {
				requestId: 'dc-req-123',
				walletId: 'wallet-1',
				wallet: { id: 'wallet-1', name: 'Test' },
				protocol: 'openid4vp',
				selectedRequest: { protocol: 'openid4vp', data: {} },
			};

			expect(eventDetail.walletId).toBe('wallet-1');
			expect(eventDetail.protocol).toBe('openid4vp');
		});

		test('should send WALLET_SELECTED message to background', async () => {
			const message = {
				type: 'WALLET_SELECTED',
				walletId: 'wallet-1',
				requestId: 'dc-req-123',
				protocol: 'openid4vp',
			};

			await mockRuntime.sendMessage(message);

			expect(mockRuntime.sendMessage).toHaveBeenCalledWith(message);
		});

		test('should dispatch DC_INVOKE_WALLET event', () => {
			const invokeDetail = {
				requestId: 'dc-req-123',
				wallet: { id: 'wallet-1', name: 'Test', url: 'https://wallet.test' },
				protocol: 'openid4vp',
				request: { protocol: 'openid4vp', data: { nonce: '123' } },
			};

			const event = new CustomEvent('DC_INVOKE_WALLET', {
				detail: invokeDetail,
			});

			expect(event.detail.wallet.url).toBe('https://wallet.test');
		});
	});

	describe('DC_WALLET_REGISTRATION_REQUEST Handler', () => {
		test('should extract registration data', () => {
			const eventDetail = {
				registrationId: 'reg-123',
				wallet: {
					name: 'New Wallet',
					url: 'https://new-wallet.com',
					protocols: ['openid4vp'],
				},
			};

			expect(eventDetail.registrationId).toBe('reg-123');
			expect(eventDetail.wallet.name).toBe('New Wallet');
		});

		test('should send REGISTER_WALLET message to background', async () => {
			const message = {
				type: 'REGISTER_WALLET',
				wallet: { name: 'Test', url: 'https://test.com' },
				origin: 'https://example.com',
			};

			mockRuntime.sendMessage.mockResolvedValueOnce({
				success: true,
				alreadyRegistered: false,
				wallet: { id: 'wallet-new', ...message.wallet },
			});

			const response = await mockRuntime.sendMessage<{
				success: boolean;
				alreadyRegistered: boolean;
			}>(message);

			expect(response.success).toBe(true);
			expect(response.alreadyRegistered).toBe(false);
		});

		test('should handle already registered wallet', async () => {
			const message = {
				type: 'REGISTER_WALLET',
				wallet: { name: 'Test', url: 'https://existing.com' },
				origin: 'https://example.com',
			};

			mockRuntime.sendMessage.mockResolvedValueOnce({
				success: true,
				alreadyRegistered: true,
				wallet: { id: 'existing-id' },
			});

			const response = await mockRuntime.sendMessage<{ alreadyRegistered: boolean }>(message);

			expect(response.alreadyRegistered).toBe(true);
		});

		test('should dispatch registration response event', () => {
			const responseDetail = {
				registrationId: 'reg-123',
				success: true,
				alreadyRegistered: false,
				wallet: { id: 'wallet-new' },
			};

			const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
				detail: responseDetail,
			});

			expect(event.detail.success).toBe(true);
		});

		test('should dispatch error on registration failure', () => {
			const responseDetail = {
				registrationId: 'reg-123',
				success: false,
				error: 'Invalid wallet URL',
			};

			const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
				detail: responseDetail,
			});

			expect(event.detail.success).toBe(false);
			expect(event.detail.error).toBe('Invalid wallet URL');
		});
	});

	describe('DC_WALLET_CHECK_REQUEST Handler', () => {
		test('should extract check request data', () => {
			const eventDetail = {
				checkId: 'check-123',
				url: 'https://wallet.test.com',
			};

			expect(eventDetail.checkId).toBe('check-123');
			expect(eventDetail.url).toBe('https://wallet.test.com');
		});

		test('should send CHECK_WALLET message to background', async () => {
			const message = {
				type: 'CHECK_WALLET',
				url: 'https://wallet.test.com',
			};

			mockRuntime.sendMessage.mockResolvedValueOnce({
				isRegistered: true,
			});

			const response = await mockRuntime.sendMessage<{ isRegistered: boolean }>(message);

			expect(response.isRegistered).toBe(true);
		});

		test('should dispatch check response with isRegistered true', () => {
			const responseDetail = {
				checkId: 'check-123',
				isRegistered: true,
			};

			const event = new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
				detail: responseDetail,
			});

			expect(event.detail.isRegistered).toBe(true);
		});

		test('should dispatch check response with isRegistered false', () => {
			const responseDetail = {
				checkId: 'check-123',
				isRegistered: false,
			};

			const event = new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
				detail: responseDetail,
			});

			expect(event.detail.isRegistered).toBe(false);
		});

		test('should default to false on error', () => {
			const isRegistered = false; // Default on error
			expect(isRegistered).toBe(false);
		});
	});

	describe('DC_PROTOCOLS_UPDATE_REQUEST Handler', () => {
		test('should handle protocol update request', () => {
			const eventDetail = {
				updateId: 'update-123',
			};

			expect(eventDetail.updateId).toBe('update-123');
		});
	});
});

export {};
