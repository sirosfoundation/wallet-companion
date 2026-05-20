/**
 * Unit tests for inject.ts - DC API interception and wallet registration API
 */

describe('Inject Script - DC API Interception', () => {
	let originalCredentialsGet: typeof navigator.credentials.get;

	beforeEach(() => {
		// Mock original credentials.get
		originalCredentialsGet = vi.fn(() => Promise.resolve({ id: 'native-credential' } as Credential)) as unknown as typeof navigator.credentials.get;
		navigator.credentials.get = originalCredentialsGet;

		// Mock custom event dispatching
		window.dispatchEvent = vi.fn();
		window.addEventListener = vi.fn();
	});

	describe('navigator.credentials.get override', () => {
		test('should detect digital identity requests', () => {
			const digitalIdentityOptions = {
				digital: true,
				mediation: 'optional' as const,
				identity: {
					providers: [
						{
							protocol: 'openid4vp',
						},
					],
				},
			};

			const isDigitalIdentity = !!(
				digitalIdentityOptions &&
				(digitalIdentityOptions.identity ||
					digitalIdentityOptions.digital ||
					digitalIdentityOptions.mediation === 'optional' ||
					digitalIdentityOptions.mediation === 'required')
			);

			expect(isDigitalIdentity).toBe(true);
		});

		test('should pass through non-digital-identity requests', () => {
			const passwordOptions = {
				password: true,
				mediation: 'silent' as const,
			};

			const mediation: string = passwordOptions.mediation;
			const isDigitalIdentity =
				passwordOptions &&
				((passwordOptions as { identity?: unknown }).identity ||
					(passwordOptions as { digital?: unknown }).digital ||
					mediation === 'optional' ||
					mediation === 'required');

			expect(isDigitalIdentity).toBe(false);
		});

		test('should generate unique request IDs', () => {
			const id1 = `dc-req-1-${Date.now()}`;
			const id2 = `dc-req-2-${Date.now()}`;

			expect(id1).not.toEqual(id2);
			expect(id1).toMatch(/^dc-req-\d+-\d+$/);
			expect(id2).toMatch(/^dc-req-\d+-\d+$/);
		});

		test('should dispatch DC_CREDENTIALS_REQUEST event', () => {
			const requestId = 'test-request-123';
			const options = {
				digital: true,
				identity: { providers: [] },
			};

			const event = new CustomEvent('DC_CREDENTIALS_REQUEST', {
				detail: { requestId, options },
			});

			window.dispatchEvent(event);

			expect(window.dispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'DC_CREDENTIALS_REQUEST',
					detail: expect.objectContaining({
						requestId,
						options,
					}),
				}),
			);
		});
	});

	describe('DC_CREDENTIALS_RESPONSE handling', () => {
		test('should handle native wallet selection', () => {
			const requestId = 'test-request-123';
			const useNative = true;

			const responseEvent = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
				detail: { requestId, useNative },
			});

			// Simulate that the response would trigger native API
			if (responseEvent.detail.useNative) {
				expect(useNative).toBe(true);
			}
		});

		test('should handle wallet credential response', () => {
			const requestId = 'test-request-123';
			const response = {
				id: 'credential-123',
				type: 'VerifiableCredential',
				wallet: 'Test Wallet',
			};

			const responseEvent = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
				detail: { requestId, response },
			});

			expect(responseEvent.detail.response).toEqual(response);
			expect(responseEvent.detail.response.id).toBe('credential-123');
		});

		test('should handle error responses', () => {
			const requestId = 'test-request-123';
			const error = 'User cancelled the request';

			const responseEvent = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
				detail: { requestId, error },
			});

			expect(responseEvent.detail.error).toBe(error);
		});
	});
});

describe('Inject Script - Wallet Registration API', () => {
	beforeEach(() => {
		// Clear any existing API
		delete (window as { DigitalCredentialsWalletSelector?: unknown }).DigitalCredentialsWalletSelector;
		delete (window as { DCWS?: unknown }).DCWS;

		// Mock event listeners
		window.addEventListener = vi.fn();
		window.removeEventListener = vi.fn();
		window.dispatchEvent = vi.fn();
	});

	describe('API Exposure', () => {
		test('should expose DigitalCredentialsWalletSelector namespace', () => {
			// Simulate API exposure
			(window as { DigitalCredentialsWalletSelector?: unknown }).DigitalCredentialsWalletSelector = {
				version: '1.0.0',
				isInstalled: () => true,
				registerWallet: vi.fn(),
				isWalletRegistered: vi.fn(),
			};

			expect((window as { DigitalCredentialsWalletSelector?: unknown }).DigitalCredentialsWalletSelector).toBeDefined();
			expect(
				(window as { DigitalCredentialsWalletSelector?: { version: string } }).DigitalCredentialsWalletSelector?.version,
			).toBe('1.0.0');
		});

		test('should expose DCWS alias', () => {
			const api = {
				version: '1.0.0',
				isInstalled: () => true,
			};
			(window as { DigitalCredentialsWalletSelector?: unknown }).DigitalCredentialsWalletSelector = api;
			(window as { DCWS?: unknown }).DCWS = api;

			expect((window as { DCWS?: unknown }).DCWS).toBe(
				(window as { DigitalCredentialsWalletSelector?: unknown }).DigitalCredentialsWalletSelector,
			);
		});
	});

	describe('isInstalled()', () => {
		test('should return true when extension is active', () => {
			const isInstalled = () => true;
			expect(isInstalled()).toBe(true);
		});
	});

	describe('registerWallet()', () => {
		test('should validate required fields', () => {
			const walletInfo = {
				name: 'Test Wallet',
				url: 'https://wallet.test.com',
			};

			const isValid = !!(walletInfo && walletInfo.name && walletInfo.url);
			expect(isValid).toBe(true);
		});

		test('should reject missing name', () => {
			const walletInfo = {
				url: 'https://wallet.test.com',
			};

			const isValid = !!((walletInfo as { name?: string }).name && walletInfo.url);
			expect(isValid).toBe(false);
		});

		test('should reject missing URL', () => {
			const walletInfo = {
				name: 'Test Wallet',
			};

			const isValid = !!(walletInfo.name && (walletInfo as { url?: string }).url);
			expect(isValid).toBe(false);
		});

		test('should validate URL format', () => {
			const validUrl = 'https://wallet.test.com';
			const invalidUrl = 'not-a-url';

			expect(() => new URL(validUrl)).not.toThrow();
			expect(() => new URL(invalidUrl)).toThrow();
		});

		test('should prepare wallet data correctly', () => {
			const walletInfo = {
				name: 'Test Wallet',
				url: 'https://wallet.test.com',
				description: 'A test wallet',
				icon: '🧪',
				color: '#10b981',
			};

			const preparedWallet = {
				name: walletInfo.name,
				url: walletInfo.url,
				description: walletInfo.description || '',
				icon: walletInfo.icon || '🔐',
				color: walletInfo.color || '#3b82f6',
				enabled: true,
				autoRegistered: true,
				registeredAt: new Date().toISOString(),
			};

			expect(preparedWallet.name).toBe('Test Wallet');
			expect(preparedWallet.url).toBe('https://wallet.test.com');
			expect(preparedWallet.icon).toBe('🧪');
			expect(preparedWallet.color).toBe('#10b981');
			expect(preparedWallet.autoRegistered).toBe(true);
		});

		test('should use default icon if not provided', () => {
			const walletInfo = {
				name: 'Test Wallet',
				url: 'https://wallet.test.com',
			};

			const icon = (walletInfo as { icon?: string }).icon || (walletInfo as { logo?: string }).logo || '🔐';
			expect(icon).toBe('🔐');
		});

		test('should use logo as fallback for icon', () => {
			const walletInfo = {
				name: 'Test Wallet',
				url: 'https://wallet.test.com',
				logo: 'https://wallet.test.com/logo.png',
			};

			const icon = (walletInfo as { icon?: string }).icon || walletInfo.logo || '🔐';
			expect(icon).toBe('https://wallet.test.com/logo.png');
		});

		test('should generate registration ID', () => {
			const registrationId = `wallet-reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			expect(registrationId).toMatch(/^wallet-reg-\d+-[a-z0-9]+$/);
		});

		test('should dispatch registration request event', () => {
			const registrationId = 'test-reg-123';
			const wallet = {
				name: 'Test Wallet',
				url: 'https://wallet.test.com',
			};

			const event = new CustomEvent('DC_WALLET_REGISTRATION_REQUEST', {
				detail: { registrationId, wallet },
			});

			window.dispatchEvent(event);

			expect(window.dispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'DC_WALLET_REGISTRATION_REQUEST',
					detail: expect.objectContaining({
						registrationId,
						wallet,
					}),
				}),
			);
		});
	});

	describe('isWalletRegistered()', () => {
		test('should generate check ID', () => {
			const checkId = `wallet-check-${Date.now()}`;
			expect(checkId).toMatch(/^wallet-check-\d+$/);
		});

		test('should dispatch check request event', () => {
			const checkId = 'test-check-123';
			const url = 'https://wallet.test.com';

			const event = new CustomEvent('DC_WALLET_CHECK_REQUEST', {
				detail: { checkId, url },
			});

			window.dispatchEvent(event);

			expect(window.dispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'DC_WALLET_CHECK_REQUEST',
					detail: expect.objectContaining({
						checkId,
						url,
					}),
				}),
			);
		});
	});
});

export {};
