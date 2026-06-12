/**
 * Integration tests for message routing
 *
 * Tests that all message types are correctly routed through handleMessage
 * to appropriate handlers. No browser required - tests the background message
 * dispatch logic directly.
 */

import { handleMessage } from '../../src/background/handlers';
import { InboundMessages } from '../../src/shared/schemas/messages';
import { Stores } from '../../src/background/storage';

// Mock the storage module
vi.mock('../../src/background/storage', () => ({
	Stores: {
		options: {
			getEnabled: vi.fn().mockResolvedValue(true),
			getDeveloperMode: vi.fn().mockResolvedValue(false),
			updateOptions: vi.fn().mockResolvedValue(undefined),
		},
		wallets: {
			getAll: vi.fn().mockResolvedValue([]),
			setAll: vi.fn().mockResolvedValue(undefined),
		},
		stats: {
			getStats: vi.fn().mockResolvedValue({ interceptCount: 0, walletUses: {} }),
			setStats: vi.fn().mockResolvedValue(undefined),
		},
	},
}));

// Mock runtime (used by SHOW_WALLET_SELECTOR for tab injection)
vi.mock('../../src/shared/runtime', () => ({
	runtimeSendMessage: vi.fn(),
}));

const mockStores = {
	wallets: {
		getAll: vi.mocked(Stores.wallets.getAll),
		setAll: vi.mocked(Stores.wallets.setAll),
	},
	options: {
		getEnabled: vi.mocked(Stores.options.getEnabled),
		getDeveloperMode: vi.mocked(Stores.options.getDeveloperMode),
		updateOptions: vi.mocked(Stores.options.updateOptions),
	},
	stats: {
		getStats: vi.mocked(Stores.stats.getStats),
		setStats: vi.mocked(Stores.stats.setStats),
	},
};

/**
 * Helper to send a message and get the response
 */
function sendMessage<T>(message: object): Promise<T> {
	return new Promise((resolve) => {
		const sender = { tab: { id: 1 }, frameId: 0 };
		handleMessage(message, sender, (response) => resolve(response as T));
	});
}

describe('Message Routing Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementations
		mockStores.options.getEnabled.mockResolvedValue(true);
		mockStores.options.getDeveloperMode.mockResolvedValue(false);
		mockStores.wallets.getAll.mockResolvedValue([]);
		mockStores.stats.getStats.mockResolvedValue({ interceptCount: 0, walletUses: {} });
	});

	describe('GET_WALLETS', () => {
		it('should return empty array when no wallets configured', async () => {
			mockStores.wallets.getAll.mockResolvedValue([]);

			const response = await sendMessage<{ wallets: unknown[] }>({
				type: InboundMessages.GET_WALLETS,
			});

			expect(response.wallets).toEqual([]);
		});

		it('should return all configured wallets', async () => {
			const mockWallets = [
				{
					id: 'w1',
					name: 'Wallet 1',
					url: 'https://w1.com',
					protocols: ['openid4vp'],
					enabled: true,
					icon: 'data:image/png;base64,some-b64-string==',
				},
				{
					id: 'w2',
					name: 'Wallet 2',
					url: 'https://w2.com',
					protocols: ['openid4vp'],
					enabled: false,
					icon: 'data:image/png;base64,some-b64-string==',
				},
			];
			mockStores.wallets.getAll.mockResolvedValue(mockWallets);

			const response = await sendMessage<{ wallets: typeof mockWallets }>({
				type: InboundMessages.GET_WALLETS,
			});

			expect(response.wallets).toHaveLength(2);
			expect(response.wallets[0].name).toBe('Wallet 1');
		});
	});

	describe('SAVE_WALLETS', () => {
		it('should save wallets to storage', async () => {
			const wallets = [
				{
					id: 'w1',
					name: 'New Wallet',
					url: 'https://new.com',
					protocols: ['openid4vp'],
					enabled: true,
					icon: 'data:image/png;base64,some-b64-string==',
				},
			];

			const response = await sendMessage<{ success: boolean }>({
				type: InboundMessages.SAVE_WALLETS,
				wallets,
			});

			expect(response.success).toBe(true);
			expect(mockStores.wallets.setAll).toHaveBeenCalledWith(wallets);
		});
	});

	describe('REGISTER_WALLET', () => {
		it('should register a new wallet', async () => {
			mockStores.wallets.getAll.mockResolvedValue([]);

			const response = await sendMessage<{
				success: boolean;
				alreadyRegistered: boolean;
				wallet: { id: string };
			}>({
				type: InboundMessages.REGISTER_WALLET,
				wallet: {
					name: 'Test Wallet',
					url: 'https://test.wallet.com',
					protocols: ['openid4vp'],
				},
				origin: 'https://test.wallet.com',
			});

			expect(response.success).toBe(true);
			expect(response.alreadyRegistered).toBe(false);
			expect(response.wallet.id).toMatch(/^wallet-/);
			expect(mockStores.wallets.setAll).toHaveBeenCalled();
		});

		it('should detect already registered wallet', async () => {
			mockStores.wallets.getAll.mockResolvedValue([
				{
					id: 'existing',
					name: 'Existing',
					url: 'https://test.wallet.com',
					protocols: ['openid4vp'],
					enabled: true,
					icon: 'data:image/png;base64,some-b64-string==',
				},
			]);

			const response = await sendMessage<{ success: boolean; alreadyRegistered: boolean }>({
				type: InboundMessages.REGISTER_WALLET,
				wallet: {
					name: 'Different Name',
					url: 'https://test.wallet.com', // Same URL
					protocols: ['openid4vp'],
				},
				origin: 'https://test.wallet.com',
			});

			expect(response.success).toBe(true);
			expect(response.alreadyRegistered).toBe(true);
		});
	});

	describe('CHECK_WALLET', () => {
		it('should return true for registered wallet', async () => {
			mockStores.wallets.getAll.mockResolvedValue([
				{
					id: 'w1',
					name: 'Wallet',
					url: 'https://registered.com',
					protocols: ['openid4vp'],
					enabled: true,
					icon: 'data:image/png;base64,some-b64-string==',
				},
			]);

			const response = await sendMessage<{ isRegistered: boolean }>({
				type: InboundMessages.CHECK_WALLET,
				url: 'https://registered.com',
			});

			expect(response.isRegistered).toBe(true);
		});

		it('should return false for unregistered wallet', async () => {
			mockStores.wallets.getAll.mockResolvedValue([]);

			const response = await sendMessage<{ isRegistered: boolean }>({
				type: InboundMessages.CHECK_WALLET,
				url: 'https://unknown.com',
			});

			expect(response.isRegistered).toBe(false);
		});
	});

	describe('GET_SUPPORTED_PROTOCOLS', () => {
		it('should return empty array when no wallets', async () => {
			mockStores.wallets.getAll.mockResolvedValue([]);

			const response = await sendMessage<{ protocols: string[] }>({
				type: InboundMessages.GET_SUPPORTED_PROTOCOLS,
			});

			expect(response.protocols).toEqual([]);
		});

		it('should return aggregated protocols from all enabled wallets', async () => {
			mockStores.wallets.getAll.mockResolvedValue([
				{
					id: 'w1',
					name: 'W1',
					url: 'https://w1.com',
					protocols: ['openid4vp', 'proto-a'],
					enabled: true,
					icon: 'data:image/png;base64,some-b64-string==',
				},
				{
					id: 'w2',
					name: 'W2',
					url: 'https://w2.com',
					protocols: ['openid4vp', 'proto-b'],
					enabled: true,
					icon: 'data:image/png;base64,some-b64-string==',
				},
				{
					id: 'w3',
					name: 'W3',
					url: 'https://w3.com',
					protocols: ['proto-c'],
					enabled: false,
					icon: 'data:image/png;base64,some-b64-string==',
				}, // Disabled
			]);

			const response = await sendMessage<{ protocols: string[] }>({
				type: InboundMessages.GET_SUPPORTED_PROTOCOLS,
			});

			// Should include protocols from enabled wallets only, deduplicated
			expect(response.protocols).toContain('openid4vp');
			expect(response.protocols).toContain('proto-a');
			expect(response.protocols).toContain('proto-b');
			// Should NOT include proto-c (disabled wallet)
			expect(response.protocols).not.toContain('proto-c');
		});
	});

	describe('GET_SETTINGS', () => {
		it('should return current settings', async () => {
			mockStores.options.getEnabled.mockResolvedValue(true);
			mockStores.options.getDeveloperMode.mockResolvedValue(true);
			mockStores.stats.getStats.mockResolvedValue({
				interceptCount: 5,
				walletUses: { w1: 3 },
			});

			const response = await sendMessage<{
				enabled: boolean;
				developerMode: boolean;
				stats: object;
			}>({
				type: InboundMessages.GET_SETTINGS,
			});

			expect(response.enabled).toBe(true);
			expect(response.developerMode).toBe(true);
			expect(response.stats).toEqual({ interceptCount: 5, walletUses: { w1: 3 } });
		});
	});

	describe('SAVE_SETTINGS', () => {
		it('should update settings', async () => {
			const response = await sendMessage<{ success: boolean }>({
				type: InboundMessages.SAVE_SETTINGS,
				enabled: false,
				developerMode: true,
			});

			expect(response.success).toBe(true);
			expect(mockStores.options.updateOptions).toHaveBeenCalledWith({
				enabled: false,
				developerMode: true,
			});
		});
	});

	describe('TOGGLE_ENABLED', () => {
		it('should toggle extension enabled state', async () => {
			const response = await sendMessage<{ success: boolean }>({
				type: InboundMessages.TOGGLE_ENABLED,
				enabled: false,
			});

			expect(response.success).toBe(true);
			expect(mockStores.options.updateOptions).toHaveBeenCalledWith({ enabled: false });
		});
	});

	describe('CONTENT_SCRIPT_READY', () => {
		it('should acknowledge content script ready', async () => {
			const response = await sendMessage<{ success: boolean }>({
				type: InboundMessages.CONTENT_SCRIPT_READY,
				timestamp: Date.now(),
			});

			expect(response.success).toBe(true);
		});
	});

	describe('CLEAR_STATS', () => {
		it('should clear usage statistics', async () => {
			const response = await sendMessage<{ success: boolean }>({
				type: InboundMessages.CLEAR_STATS,
			});

			expect(response.success).toBe(true);
			expect(mockStores.stats.setStats).toHaveBeenCalledWith({
				interceptCount: 0,
				walletUses: {},
			});
		});
	});

	describe('Unknown Message Type', () => {
		it('should return error for unknown message type', async () => {
			const response = await sendMessage<{ error: string }>({
				type: 'UNKNOWN_MESSAGE_TYPE',
			});

			expect(response.error).toBeDefined();
		});
	});

	describe('Invalid Message Format', () => {
		it('should return error for malformed message', async () => {
			const response = await sendMessage<{ error: string }>({
				// Missing type
				someField: 'value',
			});

			expect(response.error).toBeDefined();
		});
	});
});
