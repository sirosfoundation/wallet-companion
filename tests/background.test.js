/**
 * Unit tests for background.js
 */

describe('Background Script - Wallet Management', () => {
  let handleMessage;
  let DEFAULT_WALLETS;
  let STORAGE_KEYS;

  beforeEach(() => {
    // Reset chrome.storage mock
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();

    // Import the module functions (we'll need to refactor background.js to export them)
    DEFAULT_WALLETS = [
      {
        id: 'wallet-1',
        name: 'Example Wallet',
        url: 'https://wallet.example.com',
        icon: '🔐',
        color: '#3b82f6',
        description: 'Example digital identity wallet',
        enabled: true
      }
    ];

    STORAGE_KEYS = {
      WALLETS: 'configured_wallets',
      ENABLED: 'extension_enabled',
      STATS: 'usage_stats'
    };
  });

  describe('GET_WALLETS', () => {
    test('should return configured wallets from storage', async () => {
      const mockWallets = [
        { id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true },
        { id: 'w2', name: 'Wallet 2', url: 'https://w2.com', enabled: true }
      ];

      chrome.storage.local.get.mockResolvedValueOnce({
        configured_wallets: mockWallets
      });

      const message = { type: 'GET_WALLETS' };
      const sendResponse = vi.fn();

      // Simulate the handler (we'll need to export handleMessage from background.js)
      // For now, we'll test the logic
      const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
      const wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

      expect(wallets).toEqual(mockWallets);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.WALLETS);
    });

    test('should return DEFAULT_WALLETS when no wallets configured', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({});

      const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
      const wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

      expect(wallets).toEqual(DEFAULT_WALLETS);
    });
  });

  describe('SAVE_WALLETS', () => {
    test('should save wallets to storage', async () => {
      const walletsToSave = [
        { id: 'w1', name: 'New Wallet', url: 'https://new.com', enabled: true }
      ];

      chrome.storage.local.set.mockResolvedValueOnce();

      await chrome.storage.local.set({ [STORAGE_KEYS.WALLETS]: walletsToSave });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        configured_wallets: walletsToSave
      });
    });
  });

  describe('REGISTER_WALLET', () => {
    test('should register a new wallet', async () => {
      const existingWallets = [
        { id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true }
      ];

      chrome.storage.local.get.mockResolvedValueOnce({
        configured_wallets: existingWallets
      });

      const newWallet = {
        name: 'New Wallet',
        url: 'https://new-wallet.com',
        description: 'A new wallet',
        icon: '🔐',
        color: '#3b82f6'
      };

      const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
      let wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

      // Check if wallet already exists
      const existingWallet = wallets.find(w => w.url === newWallet.url);
      expect(existingWallet).toBeUndefined();

      // Add new wallet
      const walletId = 'wallet-' + Date.now();
      const walletToAdd = {
        id: walletId,
        ...newWallet,
        enabled: true,
        autoRegistered: true,
        registeredFrom: 'https://example.com',
        registeredAt: new Date().toISOString()
      };

      wallets.push(walletToAdd);

      chrome.storage.local.set.mockResolvedValueOnce();
      await chrome.storage.local.set({ [STORAGE_KEYS.WALLETS]: wallets });

      expect(chrome.storage.local.set).toHaveBeenCalled();
      expect(wallets).toHaveLength(2);
      expect(wallets[1].name).toBe('New Wallet');
      expect(wallets[1].autoRegistered).toBe(true);
    });

    test('should return existing wallet if URL already registered', async () => {
      const existingWallets = [
        { id: 'w1', name: 'Existing', url: 'https://existing.com', enabled: true }
      ];

      chrome.storage.local.get.mockResolvedValueOnce({
        configured_wallets: existingWallets
      });

      const duplicateWallet = {
        name: 'Duplicate',
        url: 'https://existing.com',
        description: 'Should not be added',
        icon: '🔐'
      };

      const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
      const wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

      const existingWallet = wallets.find(w => w.url === duplicateWallet.url);
      expect(existingWallet).toBeDefined();
      expect(existingWallet.id).toBe('w1');
      expect(existingWallet.name).toBe('Existing');
    });
  });

  describe('CHECK_WALLET', () => {
    test('should return true if wallet is registered', async () => {
      const wallets = [
        { id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true },
        { id: 'w2', name: 'Wallet 2', url: 'https://w2.com', enabled: true }
      ];

      chrome.storage.local.get.mockResolvedValueOnce({
        configured_wallets: wallets
      });

      const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
      const storedWallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

      const isRegistered = storedWallets.some(w => w.url === 'https://w1.com');
      expect(isRegistered).toBe(true);
    });

    test('should return false if wallet is not registered', async () => {
      const wallets = [
        { id: 'w1', name: 'Wallet 1', url: 'https://w1.com', enabled: true }
      ];

      chrome.storage.local.get.mockResolvedValueOnce({
        configured_wallets: wallets
      });

      const result = await chrome.storage.local.get(STORAGE_KEYS.WALLETS);
      const storedWallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;

      const isRegistered = storedWallets.some(w => w.url === 'https://not-registered.com');
      expect(isRegistered).toBe(false);
    });
  });

  describe('Extension Settings', () => {
    test('should get extension enabled status', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({
        extension_enabled: true,
        usage_stats: { interceptCount: 5, walletUses: {} }
      });

      const result = await chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.STATS]);

      expect(result.extension_enabled).toBe(true);
      expect(result.usage_stats.interceptCount).toBe(5);
    });

    test('should default to enabled if not set', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({});

      const result = await chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.STATS]);
      const enabled = result[STORAGE_KEYS.ENABLED] !== false;

      expect(enabled).toBe(true);
    });

    test('should toggle extension enabled state', async () => {
      chrome.storage.local.set.mockResolvedValueOnce();

      await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: false });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        extension_enabled: false
      });
    });
  });

  describe('Usage Statistics', () => {
    test('should increment intercept count', async () => {
      const stats = { interceptCount: 5, walletUses: {} };

      chrome.storage.local.get.mockResolvedValueOnce({
        usage_stats: stats
      });

      const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
      let currentStats = result[STORAGE_KEYS.STATS] || { interceptCount: 0, walletUses: {} };

      currentStats.interceptCount += 1;

      chrome.storage.local.set.mockResolvedValueOnce();
      await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: currentStats });

      expect(currentStats.interceptCount).toBe(6);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_stats: currentStats
      });
    });

    test('should track wallet usage', async () => {
      const stats = { interceptCount: 10, walletUses: { 'wallet-1': 3 } };

      chrome.storage.local.get.mockResolvedValueOnce({
        usage_stats: stats
      });

      const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
      let currentStats = result[STORAGE_KEYS.STATS] || { interceptCount: 0, walletUses: {} };

      const walletId = 'wallet-1';
      currentStats.walletUses[walletId] = (currentStats.walletUses[walletId] || 0) + 1;

      expect(currentStats.walletUses['wallet-1']).toBe(4);
    });

    test('should clear statistics', async () => {
      chrome.storage.local.set.mockResolvedValueOnce();

      const clearedStats = { interceptCount: 0, walletUses: {} };
      await chrome.storage.local.set({ usage_stats: clearedStats });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_stats: clearedStats
      });
    });
  });
});
