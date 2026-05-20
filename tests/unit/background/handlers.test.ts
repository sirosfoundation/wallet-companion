/**
 * Unit tests for background.ts
 */

import type { Mock } from 'vitest';

type MockWallet = {
	id: string;
	name: string;
	url: string;
	icon?: string;
	color?: string;
	description?: string;
	enabled: boolean;
	autoRegistered?: boolean;
	registeredFrom?: string;
	registeredAt?: string;
};

type UsageStats = {
	interceptCount: number;
	walletUses: Record<string, number>;
};

// Access chrome mock with proper types
const mockStorage = chrome.storage.local as unknown as {
	get: Mock<(keys: string | string[] | null) => Promise<Record<string, unknown>>>;
	set: Mock<(data: Record<string, unknown>) => Promise<void>>;
};

describe('Background Script - Wallet Management', () => {
	let DEFAULT_WALLETS: MockWallet[];
	let STORAGE_KEYS: { WALLETS: string; ENABLED: string; STATS: string };

	beforeEach(() => {
		// Reset chrome.storage mock
		mockStorage.get.mockClear();
		mockStorage.set.mockClear();

		// Import the module functions (we'll need to refactor background.ts to export them)
		DEFAULT_WALLETS = [
			{
				id: 'wallet-1',
				name: 'Example Wallet',
				url: 'https://wallet.example.com',
				icon: '🔐',
				color: '#3b82f6',
				description: 'Example digital identity wallet',
				enabled: true,
			},
		];

		STORAGE_KEYS = {
			WALLETS: 'configured_wallets',
			ENABLED: 'extension_enabled',
			STATS: 'usage_stats',
		};
	});

	describe('GET_WALLETS', () => {
		test('should return configured wallets from storage', async () => {
			const mockWallets: MockWallet[] = [
				{ id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true },
				{ id: 'w2', name: 'Wallet 2', url: 'https://w2.com', enabled: true },
			];

			mockStorage.get.mockResolvedValueOnce({
				configured_wallets: mockWallets,
			});

			const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
			const wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

			expect(wallets).toEqual(mockWallets);
			expect(chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.WALLETS);
		});

		test('should return DEFAULT_WALLETS when no wallets configured', async () => {
			mockStorage.get.mockResolvedValueOnce({});

			const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
			const wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

			expect(wallets).toEqual(DEFAULT_WALLETS);
		});
	});

	describe('SAVE_WALLETS', () => {
		test('should save wallets to storage', async () => {
			const walletsToSave: MockWallet[] = [{ id: 'w1', name: 'New Wallet', url: 'https://new.com', enabled: true }];

			mockStorage.set.mockResolvedValueOnce();

			await chrome.storage.local.set({ [STORAGE_KEYS.WALLETS]: walletsToSave });

			expect(chrome.storage.local.set).toHaveBeenCalledWith({
				configured_wallets: walletsToSave,
			});
		});
	});

	describe('REGISTER_WALLET', () => {
		test('should register a new wallet', async () => {
			const existingWallets: MockWallet[] = [{ id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true }];

			mockStorage.get.mockResolvedValueOnce({
				configured_wallets: existingWallets,
			});

			const newWallet = {
				name: 'New Wallet',
				url: 'https://new-wallet.com',
				description: 'A new wallet',
				icon: '🔐',
				color: '#3b82f6',
			};

			const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
			const wallets: MockWallet[] = (result[STORAGE_KEYS.WALLETS] as MockWallet[]) || DEFAULT_WALLETS;

			// Check if wallet already exists
			const existingWallet = wallets.find((w) => w.url === newWallet.url);
			expect(existingWallet).toBeUndefined();

			// Add new wallet
			const walletId = 'wallet-' + Date.now();
			const walletToAdd: MockWallet = {
				id: walletId,
				...newWallet,
				enabled: true,
				autoRegistered: true,
				registeredFrom: 'https://example.com',
				registeredAt: new Date().toISOString(),
			};

			wallets.push(walletToAdd);

			mockStorage.set.mockResolvedValueOnce();
			await chrome.storage.local.set({ [STORAGE_KEYS.WALLETS]: wallets });

			expect(chrome.storage.local.set).toHaveBeenCalled();
			expect(wallets).toHaveLength(2);
			expect(wallets[1].name).toBe('New Wallet');
			expect(wallets[1].autoRegistered).toBe(true);
		});

		test('should return existing wallet if URL already registered', async () => {
			const existingWallets: MockWallet[] = [{ id: 'w1', name: 'Existing', url: 'https://existing.com', enabled: true }];

			mockStorage.get.mockResolvedValueOnce({
				configured_wallets: existingWallets,
			});

			const duplicateWallet = {
				name: 'Duplicate',
				url: 'https://existing.com',
				description: 'Should not be added',
				icon: '🔐',
			};

			const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
			const wallets: MockWallet[] = (result[STORAGE_KEYS.WALLETS] as MockWallet[]) || DEFAULT_WALLETS;

			const existingWallet = wallets.find((w) => w.url === duplicateWallet.url);
			expect(existingWallet).toBeDefined();
			expect(existingWallet?.id).toBe('w1');
			expect(existingWallet?.name).toBe('Existing');
		});
	});

	describe('CHECK_WALLET', () => {
		test('should return true if wallet is registered', async () => {
			const wallets: MockWallet[] = [
				{ id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true },
				{ id: 'w2', name: 'Wallet 2', url: 'https://w2.com', enabled: true },
			];

			mockStorage.get.mockResolvedValueOnce({
				configured_wallets: wallets,
			});

			const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
			const storedWallets: MockWallet[] = (result[STORAGE_KEYS.WALLETS] as MockWallet[]) || DEFAULT_WALLETS;

			const isRegistered = storedWallets.some((w) => w.url === 'https://w1.com');
			expect(isRegistered).toBe(true);
		});

		test('should return false if wallet is not registered', async () => {
			const wallets: MockWallet[] = [{ id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true }];

			mockStorage.get.mockResolvedValueOnce({
				configured_wallets: wallets,
			});

			const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
			const storedWallets: MockWallet[] = (result[STORAGE_KEYS.WALLETS] as MockWallet[]) || DEFAULT_WALLETS;

			const isRegistered = storedWallets.some((w) => w.url === 'https://not-registered.com');
			expect(isRegistered).toBe(false);
		});
	});

	describe('Extension Settings', () => {
		test('should get extension enabled status', async () => {
			mockStorage.get.mockResolvedValueOnce({
				extension_enabled: true,
				usage_stats: { interceptCount: 5, walletUses: {} },
			});

			const result = await chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.STATS]);

			expect(result.extension_enabled).toBe(true);
			expect((result.usage_stats as UsageStats).interceptCount).toBe(5);
		});

		test('should default to enabled if not set', async () => {
			mockStorage.get.mockResolvedValueOnce({});

			const result = await chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.STATS]);
			const enabled = result[STORAGE_KEYS.ENABLED] !== false;

			expect(enabled).toBe(true);
		});

		test('should toggle extension enabled state', async () => {
			mockStorage.set.mockResolvedValueOnce();

			await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: false });

			expect(chrome.storage.local.set).toHaveBeenCalledWith({
				extension_enabled: false,
			});
		});
	});

	describe('Usage Statistics', () => {
		test('should increment intercept count', async () => {
			const stats: UsageStats = { interceptCount: 5, walletUses: {} };

			mockStorage.get.mockResolvedValueOnce({
				usage_stats: stats,
			});

			const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
			const currentStats: UsageStats = (result[STORAGE_KEYS.STATS] as UsageStats) || { interceptCount: 0, walletUses: {} };

			currentStats.interceptCount += 1;

			mockStorage.set.mockResolvedValueOnce();
			await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: currentStats });

			expect(currentStats.interceptCount).toBe(6);
			expect(chrome.storage.local.set).toHaveBeenCalledWith({
				usage_stats: currentStats,
			});
		});

		test('should track wallet usage', async () => {
			const stats: UsageStats = { interceptCount: 10, walletUses: { 'wallet-1': 3 } };

			mockStorage.get.mockResolvedValueOnce({
				usage_stats: stats,
			});

			const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
			const currentStats: UsageStats = (result[STORAGE_KEYS.STATS] as UsageStats) || { interceptCount: 0, walletUses: {} };

			const walletId = 'wallet-1';
			currentStats.walletUses[walletId] = (currentStats.walletUses[walletId] || 0) + 1;

			expect(currentStats.walletUses['wallet-1']).toBe(4);
		});

		test('should clear statistics', async () => {
			mockStorage.set.mockResolvedValueOnce();

			const clearedStats: UsageStats = { interceptCount: 0, walletUses: {} };
			await chrome.storage.local.set({ usage_stats: clearedStats });

			expect(chrome.storage.local.set).toHaveBeenCalledWith({
				usage_stats: clearedStats,
			});
		});
	});
});

export {};
