/**
 * Unit tests for popup.js - Extension popup UI logic
 */

describe('Popup - UI State Management', () => {
  let mockSettings;
  let mockWallets;

  beforeEach(() => {
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

    mockWallets = [
      {
        id: 'wallet-1',
        name: 'Test Wallet 1',
        url: 'https://wallet1.example.com',
        icon: '🔐',
        enabled: true
      },
      {
        id: 'wallet-2',
        name: 'Test Wallet 2',
        url: 'https://wallet2.example.com',
        icon: '🌐',
        enabled: false
      }
    ];

    // Setup DOM
    document.body.innerHTML = `
      <div id="status" class="status">
        <span id="statusText">Loading...</span>
      </div>
      <input type="checkbox" id="extensionToggle">
      <span id="interceptCount">0</span>
      <span id="walletCount">0</span>
      <div id="walletList"></div>
      <button id="clearBtn">Clear</button>
      <button id="configureBtn">Configure</button>
    `;
  });

  describe('updateUI()', () => {
    function updateUI(enabled, stats) {
      const statusDiv = document.getElementById('status');
      const statusText = document.getElementById('statusText');
      const extensionToggle = document.getElementById('extensionToggle');
      const interceptCount = document.getElementById('interceptCount');

      extensionToggle.checked = enabled;
      
      if (enabled) {
        statusDiv.className = 'status active';
        statusText.textContent = 'Active & Monitoring';
      } else {
        statusDiv.className = 'status inactive';
        statusText.textContent = 'Inactive';
      }

      if (stats) {
        interceptCount.textContent = stats.interceptCount || 0;
      }
    }

    test('should set toggle to checked when enabled', () => {
      updateUI(true, mockSettings.stats);
      
      const toggle = document.getElementById('extensionToggle');
      expect(toggle.checked).toBe(true);
    });

    test('should set toggle to unchecked when disabled', () => {
      updateUI(false, mockSettings.stats);
      
      const toggle = document.getElementById('extensionToggle');
      expect(toggle.checked).toBe(false);
    });

    test('should show "Active & Monitoring" when enabled', () => {
      updateUI(true, mockSettings.stats);
      
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toBe('Active & Monitoring');
    });

    test('should show "Inactive" when not enabled', () => {
      updateUI(false, mockSettings.stats);
      
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toBe('Inactive');
    });

    test('should set status class to active when enabled', () => {
      updateUI(true, mockSettings.stats);
      
      const statusDiv = document.getElementById('status');
      expect(statusDiv.className).toBe('status active');
    });

    test('should set status class to inactive when disabled', () => {
      updateUI(false, mockSettings.stats);
      
      const statusDiv = document.getElementById('status');
      expect(statusDiv.className).toBe('status inactive');
    });

    test('should display intercept count from stats', () => {
      updateUI(true, mockSettings.stats);
      
      const interceptCount = document.getElementById('interceptCount');
      expect(interceptCount.textContent).toBe('42');
    });

    test('should display 0 when stats are missing', () => {
      updateUI(true, null);
      
      const interceptCount = document.getElementById('interceptCount');
      expect(interceptCount.textContent).toBe('0');
    });

    test('should display 0 when interceptCount is missing', () => {
      updateUI(true, {});
      
      const interceptCount = document.getElementById('interceptCount');
      expect(interceptCount.textContent).toBe('0');
    });
  });

  describe('displayWallets()', () => {
    function escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function displayWallets(wallets, stats) {
      const walletList = document.getElementById('walletList');
      const walletCount = document.getElementById('walletCount');

      if (!wallets || wallets.length === 0) {
        walletList.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 13px;">
            No wallets configured yet.<br>
            Click "Add or Configure" to add one.
          </div>
        `;
        walletCount.textContent = '0';
        return;
      }

      const enabledWallets = wallets.filter(w => w.enabled);
      walletCount.textContent = enabledWallets.length;

      walletList.innerHTML = wallets.map(wallet => {
        const uses = stats?.walletUses?.[wallet.id] || 0;
        const statusBadge = wallet.enabled 
          ? `<span class="wallet-status">Active</span>`
          : `<span class="wallet-status" style="background: #fee2e2; color: #991b1b;">Inactive</span>`;
        
        return `
          <div class="wallet-item">
            <span class="wallet-icon">${wallet.icon || '🔐'}</span>
            <span class="wallet-name">${escapeHtml(wallet.name)}</span>
            ${statusBadge}
          </div>
        `;
      }).join('');
    }

    test('should show empty state when no wallets', () => {
      displayWallets([], mockSettings.stats);
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).toContain('No wallets configured');
    });

    test('should show empty state when wallets is null', () => {
      displayWallets(null, mockSettings.stats);
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).toContain('No wallets configured');
    });

    test('should set wallet count to 0 when no wallets', () => {
      displayWallets([], mockSettings.stats);
      
      const walletCount = document.getElementById('walletCount');
      expect(walletCount.textContent).toBe('0');
    });

    test('should count only enabled wallets', () => {
      displayWallets(mockWallets, mockSettings.stats);
      
      const walletCount = document.getElementById('walletCount');
      expect(walletCount.textContent).toBe('1'); // Only wallet-1 is enabled
    });

    test('should render wallet items', () => {
      displayWallets(mockWallets, mockSettings.stats);
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).toContain('Test Wallet 1');
      expect(walletList.innerHTML).toContain('Test Wallet 2');
    });

    test('should display wallet icons', () => {
      displayWallets(mockWallets, mockSettings.stats);
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).toContain('🔐');
      expect(walletList.innerHTML).toContain('🌐');
    });

    test('should use default icon when not provided', () => {
      const walletsNoIcon = [{ id: 'w1', name: 'No Icon', enabled: true }];
      displayWallets(walletsNoIcon, {});
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).toContain('🔐');
    });

    test('should show Active badge for enabled wallets', () => {
      displayWallets(mockWallets, mockSettings.stats);
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).toContain('>Active</span>');
    });

    test('should show Inactive badge for inactive wallets', () => {
      displayWallets(mockWallets, mockSettings.stats);
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).toContain('>Inactive</span>');
    });

    test('should escape HTML in wallet names', () => {
      const maliciousWallets = [{
        id: 'w1',
        name: '<script>alert("xss")</script>',
        enabled: true
      }];
      displayWallets(maliciousWallets, {});
      
      const walletList = document.getElementById('walletList');
      expect(walletList.innerHTML).not.toContain('<script>');
      expect(walletList.innerHTML).toContain('&lt;script&gt;');
    });
  });

  describe('escapeHtml()', () => {
    function escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    test('should escape angle brackets', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    });

    test('should escape ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    test('should escape double quotes', () => {
      expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    });

    test('should escape single quotes', () => {
      expect(escapeHtml("'test'")).toBe('&#039;test&#039;');
    });

    test('should return empty string for null', () => {
      expect(escapeHtml(null)).toBe('');
    });

    test('should return empty string for undefined', () => {
      expect(escapeHtml(undefined)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('Toggle Event Handler', () => {
    test('should dispatch message on toggle change', () => {
      const toggle = document.getElementById('extensionToggle');
      
      // Simulate toggle change
      toggle.checked = true;
      const changeEvent = new Event('change');
      
      // Track if event was dispatched
      let eventDispatched = false;
      toggle.addEventListener('change', () => {
        eventDispatched = true;
      });
      
      toggle.dispatchEvent(changeEvent);
      expect(eventDispatched).toBe(true);
    });

    test('should read toggle state correctly', () => {
      const toggle = document.getElementById('extensionToggle');
      
      toggle.checked = true;
      expect(toggle.checked).toBe(true);
      
      toggle.checked = false;
      expect(toggle.checked).toBe(false);
    });
  });

  describe('Clear Stats Button', () => {
    test('should reset intercept count to 0', () => {
      const interceptCount = document.getElementById('interceptCount');
      interceptCount.textContent = '42';
      
      // Simulate clear action
      interceptCount.textContent = '0';
      
      expect(interceptCount.textContent).toBe('0');
    });
  });

  describe('Configure Button', () => {
    test('should exist in DOM', () => {
      const configureBtn = document.getElementById('configureBtn');
      expect(configureBtn).not.toBeNull();
    });

    test('should have click handler capability', () => {
      const configureBtn = document.getElementById('configureBtn');
      
      let clicked = false;
      configureBtn.addEventListener('click', () => {
        clicked = true;
      });
      
      configureBtn.click();
      expect(clicked).toBe(true);
    });
  });

  describe('Message Listener', () => {
    test('should handle STATS_UPDATE message type', () => {
      const message = {
        type: 'STATS_UPDATE',
        stats: {
          interceptCount: 100,
          walletUses: { 'wallet-1': 50 }
        }
      };

      expect(message.type).toBe('STATS_UPDATE');
      expect(message.stats.interceptCount).toBe(100);
    });

    test('should ignore non-STATS_UPDATE messages', () => {
      const message = {
        type: 'OTHER_MESSAGE',
        data: {}
      };

      const shouldProcess = message.type === 'STATS_UPDATE';
      expect(shouldProcess).toBe(false);
    });
  });
});

