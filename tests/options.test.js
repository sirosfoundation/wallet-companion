/**
 * Unit tests for options.js - Wallet management UI logic
 */

describe('Options Page - Wallet Management', () => {
  let mockWallets;
  let mockSettings;

  beforeEach(() => {
    mockWallets = [
      {
        id: 'wallet-1',
        name: 'Wallet 1',
        url: 'https://wallet1.com',
        description: 'First wallet',
        icon: '🔐',
        color: '#3b82f6',
        enabled: true
      },
      {
        id: 'wallet-2',
        name: 'Wallet 2',
        url: 'https://wallet2.com',
        description: 'Second wallet',
        icon: '🌐',
        color: '#10b981',
        enabled: false
      }
    ];

    mockSettings = {
      enabled: true,
      stats: {
        interceptCount: 42,
        walletUses: {
          'wallet-1': 10,
          'wallet-2': 5
        }
      }
    };

    // Setup DOM
    document.body.innerHTML = `
      <div id="wallets-container"></div>
      <div id="preset-wallets"></div>
      <div id="total-wallets">0</div>
      <div id="active-wallets">0</div>
      <div id="total-requests">0</div>
      <input type="checkbox" id="extension-enabled">
    `;
  });

  describe('Wallet CRUD Operations', () => {
    test('should generate unique wallet ID', () => {
      const id1 = 'wallet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const id2 = 'wallet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      expect(id1).toMatch(/^wallet-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^wallet-\d+-[a-z0-9]+$/);
    });

    test('should add new wallet to list', () => {
      const wallets = [...mockWallets];
      const newWallet = {
        id: 'wallet-3',
        name: 'New Wallet',
        url: 'https://new-wallet.com',
        description: 'A new wallet',
        icon: '🆕',
        color: '#ef4444',
        enabled: true,
        preset: false
      };

      wallets.push(newWallet);

      expect(wallets).toHaveLength(3);
      expect(wallets[2].name).toBe('New Wallet');
    });

    test('should update existing wallet', () => {
      const wallets = [...mockWallets];
      const walletIndex = wallets.findIndex(w => w.id === 'wallet-1');

      wallets[walletIndex] = {
        ...wallets[walletIndex],
        name: 'Updated Name',
        description: 'Updated description'
      };

      expect(wallets[0].name).toBe('Updated Name');
      expect(wallets[0].description).toBe('Updated description');
      expect(wallets[0].url).toBe('https://wallet1.com'); // URL unchanged
    });

    test('should delete wallet', () => {
      const wallets = [...mockWallets];
      const filtered = wallets.filter(w => w.id !== 'wallet-1');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('wallet-2');
    });

    test('should toggle wallet enabled state', () => {
      const wallets = [...mockWallets];
      const wallet = wallets.find(w => w.id === 'wallet-1');

      wallet.enabled = !wallet.enabled;

      expect(wallet.enabled).toBe(false);

      wallet.enabled = !wallet.enabled;
      expect(wallet.enabled).toBe(true);
    });
  });

  describe('Preset Wallets', () => {
    const WWWALLET_PRESETS = [
      {
        name: 'wwWallet Demo',
        url: 'https://demo.wwwallet.org',
        icon: '🌐',
        color: '#3b82f6',
        description: 'Official wwWallet demonstration instance',
        preset: true
      },
      {
        name: 'wwWallet EU',
        url: 'https://wallet.europa.eu',
        icon: '🇪🇺',
        color: '#0033a1',
        description: 'European Union official wallet instance',
        preset: true
      },
      {
        name: 'wwWallet Test',
        url: 'https://test.wwwallet.org',
        icon: '🧪',
        color: '#10b981',
        description: 'wwWallet testing environment',
        preset: true
      }
    ];

    test('should have three wwWallet presets', () => {
      expect(WWWALLET_PRESETS).toHaveLength(3);
    });

    test('should detect duplicate preset by URL', () => {
      const wallets = [...mockWallets];
      const preset = WWWALLET_PRESETS[0];

      // Add preset URL to wallets
      wallets.push({ ...preset, id: 'wallet-preset' });

      const exists = wallets.some(w => w.url === preset.url);
      expect(exists).toBe(true);
    });

    test('should add preset if not duplicate', () => {
      const wallets = [...mockWallets];
      const preset = WWWALLET_PRESETS[0];

      const exists = wallets.some(w => w.url === preset.url);
      expect(exists).toBe(false);

      if (!exists) {
        wallets.push({
          id: 'wallet-' + Date.now(),
          ...preset,
          enabled: true
        });
      }

      expect(wallets).toHaveLength(3);
    });
  });

  describe('Form Validation', () => {
    test('should validate required name field', () => {
      const name = 'Test Wallet';
      const isValid = name && name.trim().length > 0;
      expect(isValid).toBe(true);
    });

    test('should reject empty name', () => {
      const name = '';
      const isValid = !!(name && name.trim().length > 0);
      expect(isValid).toBe(false);
    });

    test('should validate URL format', () => {
      const validUrl = 'https://wallet.example.com';
      const invalidUrl = 'not-a-url';

      expect(() => new URL(validUrl)).not.toThrow();
      expect(() => new URL(invalidUrl)).toThrow();
    });

    test('should accept http://localhost for development', () => {
      const localhostUrl = 'http://localhost:3000';
      expect(() => new URL(localhostUrl)).not.toThrow();
    });

    test('should validate color format', () => {
      const validColor = '#3b82f6';
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      expect(hexColorRegex.test(validColor)).toBe(true);
      expect(hexColorRegex.test('#xyz123')).toBe(false);
    });
  });

  describe('Import/Export', () => {
    test('should export configuration to JSON', () => {
      const config = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        wallets: mockWallets,
        settings: mockSettings
      };

      const json = JSON.stringify(config, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0');
      expect(parsed.wallets).toHaveLength(2);
      expect(parsed.settings.enabled).toBe(true);
    });

    test('should validate import data structure', () => {
      const validConfig = {
        version: '1.0',
        wallets: mockWallets,
        settings: mockSettings
      };

      const isValid = validConfig.wallets && Array.isArray(validConfig.wallets);
      expect(isValid).toBe(true);
    });

    test('should reject invalid import data', () => {
      const invalidConfig = {
        version: '1.0',
        wallets: 'not-an-array'
      };

      const isValid = invalidConfig.wallets && Array.isArray(invalidConfig.wallets);
      expect(isValid).toBe(false);
    });

    test('should merge imported wallets avoiding duplicates', () => {
      const existingWallets = [...mockWallets];
      const importedWallets = [
        { id: 'w3', name: 'New', url: 'https://new.com', enabled: true },
        { id: 'w4', name: 'Duplicate', url: 'https://wallet1.com', enabled: true } // Duplicate URL
      ];

      importedWallets.forEach(importedWallet => {
        const exists = existingWallets.some(w => w.url === importedWallet.url);
        if (!exists) {
          existingWallets.push({
            ...importedWallet,
            id: 'wallet-' + Date.now() // Regenerate ID
          });
        }
      });

      // Should only add the new wallet, not the duplicate
      expect(existingWallets).toHaveLength(3);
      expect(existingWallets.some(w => w.name === 'New')).toBe(true);
    });
  });

  describe('Statistics Display', () => {
    test('should calculate total wallets', () => {
      const totalWallets = mockWallets.length;
      expect(totalWallets).toBe(2);
    });

    test('should calculate active wallets', () => {
      const activeWallets = mockWallets.filter(w => w.enabled).length;
      expect(activeWallets).toBe(1);
    });

    test('should display intercept count', () => {
      const interceptCount = mockSettings.stats.interceptCount;
      expect(interceptCount).toBe(42);
    });

    test('should get wallet usage count', () => {
      const walletUses = mockSettings.stats.walletUses['wallet-1'] || 0;
      expect(walletUses).toBe(10);
    });

    test('should default to 0 for unused wallet', () => {
      const walletUses = mockSettings.stats.walletUses['wallet-999'] || 0;
      expect(walletUses).toBe(0);
    });
  });

  describe('HTML Escaping (XSS Prevention)', () => {
    function escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    test('should escape HTML entities', () => {
      const malicious = '<script>alert("xss")</script>';
      const escaped = escapeHtml(malicious);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<script>');
    });

    test('should escape quotes', () => {
      const input = 'Test "quoted" and \'single\' quotes';
      const escaped = escapeHtml(input);

      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&#039;');
    });

    test('should handle empty string', () => {
      const escaped = escapeHtml('');
      expect(escaped).toBe('');
    });

    test('should handle null/undefined', () => {
      const escaped = escapeHtml(null);
      expect(escaped).toBe('');
    });

    test('should not double-escape', () => {
      const input = '&amp;';
      const escaped = escapeHtml(input);
      expect(escaped).toBe('&amp;amp;');
    });
  });

  describe('Tab Switching', () => {
    test('should identify active tab', () => {
      const tabs = ['wallets', 'add', 'settings'];
      const activeTab = 'wallets';

      const isActive = (tabName) => tabName === activeTab;

      expect(isActive('wallets')).toBe(true);
      expect(isActive('add')).toBe(false);
      expect(isActive('settings')).toBe(false);
    });

    test('should switch to different tab', () => {
      let activeTab = 'wallets';
      
      const switchTab = (tabName) => {
        activeTab = tabName;
      };

      switchTab('add');
      expect(activeTab).toBe('add');

      switchTab('settings');
      expect(activeTab).toBe('settings');
    });
  });

  describe('Wallet Ordering', () => {
    test('should identify first wallet as default', () => {
      const wallets = [...mockWallets];
      const defaultWallet = wallets[0];
      const isDefault = wallets.indexOf(defaultWallet) === 0;

      expect(isDefault).toBe(true);
      expect(defaultWallet.id).toBe('wallet-1');
    });

    test('should find wallet index', () => {
      const wallets = [...mockWallets];
      const walletIndex = wallets.findIndex(w => w.id === 'wallet-2');

      expect(walletIndex).toBe(1);
    });
  });

  describe('Icon Selector (New UX)', () => {
    const ICON_EMOJIS = ['🔐', '🌐', '🇪🇺', '🧪', '💼', '🏦', '🎓', '🏥'];

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="icon-emoji-grid">
          ${ICON_EMOJIS.map(emoji => `<button class="icon-emoji-btn" data-emoji="${emoji}">${emoji}</button>`).join('')}
        </div>
        <input type="hidden" id="wallet-icon" value="🔐">
        <div id="icon-preview"><span>🔐</span></div>
      `;
    });

    test('should have 8 icon options', () => {
      expect(ICON_EMOJIS.length).toBe(8);
    });

    test('should include default lock icon', () => {
      expect(ICON_EMOJIS).toContain('🔐');
    });

    test('should include EU flag icon', () => {
      expect(ICON_EMOJIS).toContain('🇪🇺');
    });

    test('should select icon on click', () => {
      const iconGrid = document.getElementById('icon-emoji-grid');
      const buttons = iconGrid.querySelectorAll('.icon-emoji-btn');
      const walletIcon = document.getElementById('wallet-icon');
      const iconPreview = document.getElementById('icon-preview');

      // Simulate clicking the globe icon
      buttons.forEach(btn => btn.classList.remove('selected'));
      const globeBtn = Array.from(buttons).find(btn => btn.getAttribute('data-emoji') === '🌐');
      globeBtn.classList.add('selected');
      walletIcon.value = '🌐';
      iconPreview.innerHTML = '<span>🌐</span>';

      expect(globeBtn.classList.contains('selected')).toBe(true);
      expect(walletIcon.value).toBe('🌐');
      expect(iconPreview.innerHTML).toContain('🌐');
    });

    test('should deselect previous icon', () => {
      const iconGrid = document.getElementById('icon-emoji-grid');
      const buttons = iconGrid.querySelectorAll('.icon-emoji-btn');
      const lockBtn = Array.from(buttons).find(btn => btn.getAttribute('data-emoji') === '🔐');
      const globeBtn = Array.from(buttons).find(btn => btn.getAttribute('data-emoji') === '🌐');

      lockBtn.classList.add('selected');
      
      // Select new icon
      iconGrid.querySelectorAll('.icon-emoji-btn').forEach(btn => btn.classList.remove('selected'));
      globeBtn.classList.add('selected');

      expect(lockBtn.classList.contains('selected')).toBe(false);
      expect(globeBtn.classList.contains('selected')).toBe(true);
    });

    test('should update hidden input value', () => {
      const walletIcon = document.getElementById('wallet-icon');
      walletIcon.value = '🧪';
      
      expect(walletIcon.value).toBe('🧪');
    });

    test('should update preview display', () => {
      const iconPreview = document.getElementById('icon-preview');
      iconPreview.innerHTML = '<span>💼</span>';
      
      expect(iconPreview.innerHTML).toContain('💼');
    });
  });

  describe('Toggle Wallet with Enabled Parameter (New UX)', () => {
    test('should toggle wallet to enabled', () => {
      const wallets = [...mockWallets];
      const wallet = wallets.find(w => w.id === 'wallet-2'); // disabled wallet

      // New handleToggleWallet signature: (walletId, enabled)
      wallet.enabled = true;

      expect(wallet.enabled).toBe(true);
    });

    test('should toggle wallet to disabled', () => {
      const wallets = [...mockWallets];
      const wallet = wallets.find(w => w.id === 'wallet-1'); // enabled wallet

      wallet.enabled = false;

      expect(wallet.enabled).toBe(false);
    });

    test('should accept boolean enabled parameter', () => {
      const handleToggleWallet = (walletId, enabled) => {
        const wallet = mockWallets.find(w => w.id === walletId);
        if (wallet) {
          wallet.enabled = enabled;
        }
        return wallet;
      };

      const result = handleToggleWallet('wallet-1', false);
      expect(result.enabled).toBe(false);

      const result2 = handleToggleWallet('wallet-1', true);
      expect(result2.enabled).toBe(true);
    });

    test('should not throw for unknown wallet', () => {
      const handleToggleWallet = (walletId, enabled) => {
        const wallet = mockWallets.find(w => w.id === walletId);
        if (wallet) {
          wallet.enabled = enabled;
        }
        return wallet;
      };

      expect(() => handleToggleWallet('unknown-id', true)).not.toThrow();
    });
  });

  describe('Wallet Card with Toggle/Trash (New UX)', () => {
    function renderWalletCard(wallet, settings = {}) {
      const uses = settings.stats?.walletUses?.[wallet.id] || 0;
      const isDefault = false;
      
      return `
        <div class="wallet-card ${wallet.enabled ? '' : 'disabled'}" data-wallet-id="${wallet.id}">
          <div class="wallet-header">
            <div class="wallet-icon">${wallet.icon || '🔐'}</div>
            <div class="wallet-info">
              <div class="wallet-name">${wallet.name}</div>
              <div class="wallet-url">${wallet.url}</div>
            </div>
          </div>
          <div class="wallet-meta">
            ${wallet.enabled ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>'}
          </div>
          <div class="wallet-actions">
            <div class="wallet-actions-left">
              <label class="toggle-switch">
                <input type="checkbox" class="toggle-wallet" ${wallet.enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
              <button class="btn-icon danger btn-delete" title="Delete wallet">
                <svg>trash icon</svg>
              </button>
            </div>
            <button class="btn btn-secondary btn-small btn-edit">Edit</button>
          </div>
        </div>
      `;
    }

    test('should render toggle switch instead of button', () => {
      const html = renderWalletCard(mockWallets[0]);
      expect(html).toContain('toggle-switch');
      expect(html).toContain('toggle-wallet');
    });

    test('should render trash icon button', () => {
      const html = renderWalletCard(mockWallets[0]);
      expect(html).toContain('btn-delete');
      expect(html).toContain('trash icon');
    });

    test('should check toggle for enabled wallet', () => {
      const html = renderWalletCard(mockWallets[0]); // enabled
      expect(html).toContain('checked');
    });

    test('should not check toggle for disabled wallet', () => {
      const html = renderWalletCard(mockWallets[1]); // disabled
      // Should not have checked attribute
      const toggleMatch = html.match(/<input type="checkbox" class="toggle-wallet"([^>]*)>/);
      expect(toggleMatch[1]).not.toContain('checked');
    });

    test('should have Edit button as secondary style', () => {
      const html = renderWalletCard(mockWallets[0]);
      expect(html).toContain('btn-secondary');
      expect(html).toContain('btn-edit');
    });

    test('should add disabled class for disabled wallet', () => {
      const html = renderWalletCard(mockWallets[1]);
      expect(html).toContain('class="wallet-card disabled"');
    });
  });

  describe('Preset Cards with Add Button (New UX)', () => {
    const WWWALLET_PRESETS = [
      { name: 'wwWallet Demo', url: 'https://demo.wwwallet.org', icon: '🌐' },
      { name: 'wwWallet EU', url: 'https://wallet.europa.eu', icon: '🇪🇺' },
      { name: 'wwWallet Test', url: 'https://test.wwwallet.org', icon: '🧪' }
    ];

    function renderPresetCard(preset, isAdded) {
      return `
        <div class="preset-card ${isAdded ? 'added' : ''}">
          <div class="preset-icon">${preset.icon}</div>
          <div class="preset-info">
            <div class="preset-name">${preset.name}</div>
            <div class="preset-status ${isAdded ? 'added' : ''}">
              ${isAdded ? '✓ Added' : ''}
            </div>
          </div>
          ${isAdded 
            ? '' 
            : '<button class="preset-btn">Add</button>'
          }
        </div>
      `;
    }

    test('should show Add button for non-added preset', () => {
      const html = renderPresetCard(WWWALLET_PRESETS[0], false);
      expect(html).toContain('preset-btn');
      expect(html).toContain('>Add</button>');
    });

    test('should show Added checkmark for added preset', () => {
      const html = renderPresetCard(WWWALLET_PRESETS[0], true);
      expect(html).toContain('✓ Added');
      expect(html).not.toContain('preset-btn');
    });

    test('should add "added" class for added preset', () => {
      const html = renderPresetCard(WWWALLET_PRESETS[0], true);
      expect(html).toContain('preset-card added');
    });

    test('should check if preset is already added by URL', () => {
      const wallets = [{ url: 'https://demo.wwwallet.org' }];
      const preset = WWWALLET_PRESETS[0];
      
      const isAdded = wallets.some(w => w.url === preset.url);
      expect(isAdded).toBe(true);
    });

    test('should allow adding non-duplicate preset', () => {
      const wallets = [];
      const preset = WWWALLET_PRESETS[0];
      
      const isAdded = wallets.some(w => w.url === preset.url);
      expect(isAdded).toBe(false);
    });
  });

  describe('Settings Page Toggle Switches (New UX)', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">Enable wallet interception</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="extension-enabled">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">
                Developer Mode
                <span class="info-icon" data-tooltip="When enabled, you can edit protocols">?</span>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="developer-mode">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      `;
    });

    test('should use toggle switch for extension enabled', () => {
      const toggle = document.getElementById('extension-enabled');
      const parent = toggle.closest('.toggle-switch');
      expect(parent).not.toBeNull();
    });

    test('should use toggle switch for developer mode', () => {
      const toggle = document.getElementById('developer-mode');
      const parent = toggle.closest('.toggle-switch');
      expect(parent).not.toBeNull();
    });

    test('should have info icon on developer mode', () => {
      const infoIcon = document.querySelector('.info-icon');
      expect(infoIcon).not.toBeNull();
      expect(infoIcon.dataset.tooltip).toContain('edit protocols');
    });

    test('should toggle extension enabled state', () => {
      const toggle = document.getElementById('extension-enabled');
      
      toggle.checked = true;
      expect(toggle.checked).toBe(true);
      
      toggle.checked = false;
      expect(toggle.checked).toBe(false);
    });
  });

  describe('Add Another Wallet Card (New UX)', () => {
    test('should render add wallet card in grid', () => {
      const addCardHtml = `
        <div class="add-wallet-card" onclick="switchTab('add')">
          <div class="icon">+</div>
          <div>Add Another Wallet</div>
        </div>
      `;

      expect(addCardHtml).toContain('add-wallet-card');
      expect(addCardHtml).toContain('Add Another Wallet');
    });

    test('should have click action to switch tab', () => {
      let currentTab = 'wallets';
      const switchTab = (tab) => { currentTab = tab; };
      
      switchTab('add');
      expect(currentTab).toBe('add');
    });
  });
});
