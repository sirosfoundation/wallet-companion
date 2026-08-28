/**
 * Popup script for Digital Credentials Wallet Selector extension
 */

document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const extensionToggle = document.getElementById('extensionToggle');
  const clearBtn = document.getElementById('clearBtn');
  const configureBtn = document.getElementById('configureBtn');
  const interceptCount = document.getElementById('interceptCount');
  const walletCount = document.getElementById('walletCount');
  const walletList = document.getElementById('walletList');

  // Cross-browser compatibility
  const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
  const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

  // Load initial state
  loadState();

  // Toggle extension via header toggle switch
  extensionToggle.addEventListener('change', async function() {
    const newState = this.checked;
    await runtime.sendMessage({ type: 'TOGGLE_ENABLED', enabled: newState });
    const response = await runtime.sendMessage({ type: 'GET_SETTINGS' });
    updateUI(newState, response.stats);
  });

  // Clear statistics
  clearBtn.addEventListener('click', async function() {
    await storage.local.set({ usage_stats: { interceptCount: 0, walletUses: {} } });
    interceptCount.textContent = '0';
    loadState(); // Reload to update wallet usage counts
  });

  // Configure wallets
  configureBtn.addEventListener('click', function() {
    // Open options page or show wallet configuration
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      // Fallback: open in new tab
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  /**
   * Load the current state from background script
   */
  async function loadState() {
    try {
      const settings = await runtime.sendMessage({ type: 'GET_SETTINGS' });
      const wallets = await runtime.sendMessage({ type: 'GET_WALLETS' });
      
      updateUI(settings.enabled, settings.stats);
      displayWallets(wallets.wallets, settings.stats);
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Update UI based on enabled state
   */
  function updateUI(enabled, stats) {
    extensionToggle.checked = enabled;
    
    if (enabled) {
      statusDiv.className = 'status active';
      statusText.textContent = 'Active & monitoring';
    } else {
      statusDiv.className = 'status inactive';
      statusText.textContent = 'Disabled';
    }

    if (stats) {
      interceptCount.textContent = stats.interceptCount || 0;
    }
  }

  /**
   * Display configured wallets
   */
  function displayWallets(wallets, stats) {
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
        : `<span class="wallet-status disabled">Disabled</span>`;
      
      return `
        <div class="wallet-item">
          <span class="wallet-icon">${wallet.icon || '🔐'}</span>
          <span class="wallet-name">${escapeHtml(wallet.name)}</span>
          ${statusBadge}
        </div>
      `;
    }).join('');
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Listen for updates from background script
  runtime.onMessage.addListener(function(message) {
    if (message.type === 'STATS_UPDATE') {
      interceptCount.textContent = message.stats.interceptCount || 0;
      loadState(); // Reload to update wallet list with new usage stats
    }
  });
});
