/**
 * Options page script for Digital Wallet Configuration
 */

// Cross-browser compatibility
const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

// wwWallet preset providers
const WWWALLET_PRESETS = [
  {
    name: 'wwWallet Demo',
    url: 'https://demo.wwwallet.org',
    icon: '<svg width="24" height="24" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" rx="512" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M374.192 204.43C398.46 362.058 398.46 362.058 556.087 386.441C398.514 410.701 398.46 411.056 374.217 568.404C374.208 568.458 374.2 568.513 374.192 568.568C349.808 410.825 349.808 410.825 192.181 386.441C349.808 362.058 349.808 362.058 374.192 204.43ZM386.441 658.938C662.636 616.18 662.636 616.18 705.394 339.87C746.997 609.13 748.037 616.064 1003.55 655.702C1016.84 610.055 1024 561.865 1024 512.058C1024 229.161 794.839 0 511.942 0C229.161 0 0 229.161 0 512.058C0 794.839 229.161 1024 511.942 1024C742.49 1024 937.328 871.804 1001.58 662.405C747.921 701.696 746.881 709.785 705.394 977.775C662.636 701.58 662.636 701.58 386.441 658.938Z" fill="#1C4587"/></svg>',
    color: '#1C4587',
    description: 'Official wwWallet demonstration instance',
    protocols: ['openid4vp', 'openid4vp-v1-unsigned', 'openid4vp-v1-signed'],
    preset: true
  }
];

let wallets = [];
let settings = { enabled: true, developerMode: false, stats: { interceptCount: 0, walletUses: {} } };

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  await loadData();
  setupEventListeners();
  setupIconSelectors();
  renderAll();
  updateDeveloperModeUI();
});

/**
 * Load wallets and settings from storage
 */
async function loadData() {
  try {
    const walletsResponse = await runtime.sendMessage({ type: 'GET_WALLETS' });
    const settingsResponse = await runtime.sendMessage({ type: 'GET_SETTINGS' });
    
    wallets = walletsResponse.wallets || [];
    settings = settingsResponse || { enabled: true, developerMode: false, stats: { interceptCount: 0, walletUses: {} } };
  } catch (error) {
    console.error('Failed to load data:', error);
    showNotification('Failed to load data', 'error');
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      switchTab(this.dataset.tab);
    });
  });

  // Add wallet button
  document.getElementById('add-wallet-btn').addEventListener('click', function() {
    switchTab('add');
  });

  // Add wallet form
  document.getElementById('add-wallet-form').addEventListener('submit', handleAddWallet);

  // Edit modal
  document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
  document.getElementById('save-edit').addEventListener('click', handleSaveEdit);

  // Settings
  document.getElementById('extension-enabled').addEventListener('change', handleToggleEnabled);
  document.getElementById('developer-mode').addEventListener('change', handleToggleDeveloperMode);
  document.getElementById('clear-stats').addEventListener('click', handleClearStats);
  document.getElementById('export-config').addEventListener('click', handleExportConfig);
  document.getElementById('import-config').addEventListener('change', handleImportConfig);

  // Close modal on outside click
  document.getElementById('edit-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeEditModal();
    }
  });
}

/**
 * Setup icon selector buttons
 */
function setupIconSelectors() {
  // Add form icon selector
  const iconGrid = document.getElementById('icon-emoji-grid');
  if (iconGrid) {
    iconGrid.querySelectorAll('.icon-emoji-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        iconGrid.querySelectorAll('.icon-emoji-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('wallet-icon').value = this.dataset.emoji;
        document.getElementById('icon-preview').innerHTML = `<span>${this.dataset.emoji}</span>`;
      });
    });
  }

  // Edit form icon selector
  const editIconGrid = document.getElementById('edit-icon-emoji-grid');
  if (editIconGrid) {
    editIconGrid.querySelectorAll('.icon-emoji-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        editIconGrid.querySelectorAll('.icon-emoji-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('edit-wallet-icon').value = this.dataset.emoji;
        document.getElementById('edit-icon-preview').innerHTML = `<span>${this.dataset.emoji}</span>`;
      });
    });
  }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

/**
 * Render all content
 */
function renderAll() {
  renderWallets();
  renderPresets();
  renderStats();
  renderSettings();
}

/**
 * Render wallets list
 */
function renderWallets() {
  const container = document.getElementById('wallets-container');
  
  if (wallets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔐</div>
        <div class="empty-state-title">No wallets configured</div>
        <div class="empty-state-text">Add your first digital wallet to get started</div>
        <button class="btn empty-state-add-btn">Add Your First Wallet</button>
      </div>
    `;
    // Attach click handler for empty state button
    container.querySelector('.empty-state-add-btn').addEventListener('click', function() {
      switchTab('add');
    });
    return;
  }

  container.innerHTML = `
    <div class="wallet-grid">
      ${wallets.map(wallet => renderWalletCard(wallet)).join('')}
      <div class="add-wallet-card">
        <div class="icon">+</div>
        <div>Add Another Wallet</div>
      </div>
    </div>
  `;
  
  // Attach click handler for add another wallet card
  container.querySelector('.add-wallet-card').addEventListener('click', function() {
    switchTab('add');
  });

  // Attach event listeners to wallet actions
  wallets.forEach((wallet, index) => {
    const card = container.querySelector(`[data-wallet-id="${wallet.id}"]`);
    if (card) {
      card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(wallet));
      card.querySelector('.btn-delete').addEventListener('click', () => handleDeleteWallet(wallet.id));
      card.querySelector('.toggle-wallet').addEventListener('change', (e) => handleToggleWallet(wallet.id, e.target.checked));
    }
  });
}

/**
 * Render a single wallet card
 */
function renderWalletCard(wallet) {
  const uses = settings.stats.walletUses[wallet.id] || 0;
  const isDefault = wallets.findIndex(w => w.id === wallet.id) === 0;
  
  // Build protocols display for developer mode
  let protocolsDisplay = '';
  if (settings.developerMode && wallet.protocols && wallet.protocols.length > 0) {
    protocolsDisplay = `
      <div class="wallet-protocols" style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">Protocols:</div>
        <div style="font-size: 11px; color: #374151;">${wallet.protocols.map(p => `<code style="background: white; padding: 2px 6px; border-radius: 3px; margin-right: 4px;">${escapeHtml(p)}</code>`).join('')}</div>
      </div>
    `;
  }
  
  return `
    <div class="wallet-card ${wallet.enabled ? '' : 'disabled'}" data-wallet-id="${wallet.id}">
      <div class="wallet-header">
        <div class="wallet-icon" style="background-color: ${wallet.color || '#1C4587'}20; color: ${wallet.color || '#1C4587'};">
          ${wallet.icon || '🔐'}
        </div>
        <div class="wallet-info">
          <div class="wallet-name">${escapeHtml(wallet.name)}</div>
          <div class="wallet-url">${escapeHtml(wallet.url)}</div>
        </div>
      </div>
      
      ${protocolsDisplay}
      
      <div class="wallet-meta">
        ${wallet.enabled ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Disabled</span>'}
        ${isDefault ? '<span class="badge badge-info">Default</span>' : ''}
        ${wallet.preset ? '<span class="badge badge-info">wwWallet</span>' : ''}
        ${uses > 0 ? `<span class="badge badge-info">Used ${uses}x</span>` : ''}
      </div>
      
      <div class="wallet-actions">
        <div class="wallet-actions-left">
          <label class="toggle-switch" title="${wallet.enabled ? 'Disable' : 'Enable'} wallet">
            <input type="checkbox" class="toggle-wallet" ${wallet.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="wallet-actions-right">
          <button class="btn btn-secondary btn-small btn-edit">Edit</button>
          <button class="btn-icon danger btn-delete" title="Delete wallet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render preset wallets
 */
function renderPresets() {
  const container = document.getElementById('preset-wallets');
  
  container.innerHTML = WWWALLET_PRESETS.map(preset => {
    const isAdded = wallets.some(w => w.url === preset.url);
    return `
      <div class="preset-card ${isAdded ? 'added' : ''}" data-preset='${JSON.stringify(preset)}'>
        <div class="preset-icon">${preset.icon}</div>
        <div class="preset-info">
          <div class="preset-name">${escapeHtml(preset.name)}</div>
          ${isAdded 
            ? '<div class="preset-status added"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Added</div>'
            : '<div class="preset-status">Click to add</div>'
          }
        </div>
        <button class="preset-btn" ${isAdded ? 'disabled' : ''}>${isAdded ? 'Added' : 'Add'}</button>
      </div>
    `;
  }).join('');

  // Attach click handlers
  container.querySelectorAll('.preset-card:not(.added)').forEach(card => {
    card.querySelector('.preset-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      const preset = JSON.parse(card.dataset.preset);
      addPresetWallet(preset);
    });
  });
}

/**
 * Render statistics
 */
function renderStats() {
  document.getElementById('total-wallets').textContent = wallets.length;
  document.getElementById('active-wallets').textContent = wallets.filter(w => w.enabled).length;
  document.getElementById('total-requests').textContent = settings.stats.interceptCount || 0;
}

/**
 * Render settings
 */
function renderSettings() {
  document.getElementById('extension-enabled').checked = settings.enabled !== false;
  document.getElementById('developer-mode').checked = settings.developerMode === true;
}

/**
 * Add preset wallet
 */
async function addPresetWallet(preset) {
  // Check if this preset already exists
  const exists = wallets.some(w => w.url === preset.url);
  if (exists) {
    showNotification(`${preset.name} is already configured`, 'warning');
    return;
  }

  const wallet = {
    id: generateId(),
    name: preset.name,
    url: preset.url,
    icon: preset.icon,
    color: preset.color,
    description: preset.description,
    protocols: preset.protocols || [],
    enabled: true,
    preset: true
  };

  wallets.push(wallet);
  await saveWallets();
  renderAll();
  showNotification(`${preset.name} added successfully`, 'success');
  switchTab('wallets');
}

/**
 * Handle add wallet form submission
 */
async function handleAddWallet(e) {
  e.preventDefault();

  const wallet = {
    id: generateId(),
    name: document.getElementById('wallet-name').value,
    url: document.getElementById('wallet-url').value,
    description: document.getElementById('wallet-description').value,
    icon: document.getElementById('wallet-icon').value || '🔐',
    color: '#1C4587', // Auto-assign default color
    enabled: document.getElementById('wallet-enabled').checked,
    preset: false
  };

  // Add protocols if developer mode is enabled
  if (settings.developerMode) {
    const protocolsText = document.getElementById('wallet-protocols').value.trim();
    if (protocolsText) {
      wallet.protocols = protocolsText.split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    }
  }

  wallets.push(wallet);
  await saveWallets();
  
  e.target.reset();
  // Reset icon selector
  const iconGrid = document.getElementById('icon-emoji-grid');
  if (iconGrid) {
    iconGrid.querySelectorAll('.icon-emoji-btn').forEach(b => b.classList.remove('selected'));
    iconGrid.querySelector('[data-emoji="🔐"]').classList.add('selected');
  }
  document.getElementById('wallet-icon').value = '🔐';
  document.getElementById('icon-preview').innerHTML = '<span>🔐</span>';
  
  renderAll();
  showNotification(`${wallet.name} added successfully`, 'success');
  switchTab('wallets');
}

/**
 * Open edit modal
 */
function openEditModal(wallet) {
  document.getElementById('edit-wallet-id').value = wallet.id;
  document.getElementById('edit-wallet-name').value = wallet.name;
  document.getElementById('edit-wallet-url').value = wallet.url;
  document.getElementById('edit-wallet-description').value = wallet.description || '';
  document.getElementById('edit-wallet-icon').value = wallet.icon || '🔐';
  document.getElementById('edit-wallet-enabled').checked = wallet.enabled;
  
  // Update icon preview and selection
  const editIconPreview = document.getElementById('edit-icon-preview');
  const editIconGrid = document.getElementById('edit-icon-emoji-grid');
  if (editIconPreview) {
    editIconPreview.innerHTML = `<span>${wallet.icon || '🔐'}</span>`;
  }
  if (editIconGrid) {
    editIconGrid.querySelectorAll('.icon-emoji-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.emoji === (wallet.icon || '🔐'));
    });
  }
  
  // Populate protocols if developer mode is enabled
  if (settings.developerMode && wallet.protocols) {
    document.getElementById('edit-wallet-protocols').value = wallet.protocols.join('\n');
  } else {
    document.getElementById('edit-wallet-protocols').value = '';
  }
  
  // Ensure developer mode UI is updated for the modal
  updateDeveloperModeUI();
  
  document.getElementById('edit-modal').classList.add('active');
}

/**
 * Close edit modal
 */
function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
}

/**
 * Handle save edit
 */
async function handleSaveEdit() {
  const walletId = document.getElementById('edit-wallet-id').value;
  const walletIndex = wallets.findIndex(w => w.id === walletId);
  
  if (walletIndex === -1) return;

  const updatedWallet = {
    ...wallets[walletIndex],
    name: document.getElementById('edit-wallet-name').value,
    url: document.getElementById('edit-wallet-url').value,
    description: document.getElementById('edit-wallet-description').value,
    icon: document.getElementById('edit-wallet-icon').value || '🔐',
    enabled: document.getElementById('edit-wallet-enabled').checked
  };

  // Update protocols if developer mode is enabled
  if (settings.developerMode) {
    const protocolsText = document.getElementById('edit-wallet-protocols').value.trim();
    if (protocolsText) {
      updatedWallet.protocols = protocolsText.split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    } else {
      updatedWallet.protocols = [];
    }
  }

  wallets[walletIndex] = updatedWallet;

  await saveWallets();
  closeEditModal();
  renderAll();
  showNotification('Wallet updated successfully', 'success');
}

/**
 * Handle delete wallet
 */
async function handleDeleteWallet(walletId) {
  if (!confirm('Are you sure you want to delete this wallet?')) {
    return;
  }

  wallets = wallets.filter(w => w.id !== walletId);
  await saveWallets();
  renderAll();
  showNotification('Wallet deleted successfully', 'success');
}

/**
 * Handle toggle wallet
 */
async function handleToggleWallet(walletId, enabled) {
  const wallet = wallets.find(w => w.id === walletId);
  if (!wallet) return;

  wallet.enabled = enabled;
  await saveWallets();
  renderAll();
  showNotification(`Wallet ${wallet.enabled ? 'enabled' : 'disabled'}`, 'success');
}

/**
 * Handle toggle enabled
 */
async function handleToggleEnabled(e) {
  settings.enabled = e.target.checked;
  await saveSettings();
  showNotification(
    settings.enabled ? 'Extension enabled' : 'Extension disabled',
    'success'
  );
}

/**
 * Handle toggle developer mode
 */
async function handleToggleDeveloperMode(e) {
  settings.developerMode = e.target.checked;
  await saveSettings();
  updateDeveloperModeUI();
  showNotification(
    settings.developerMode ? 'Developer mode enabled' : 'Developer mode disabled',
    'success'
  );
}

/**
 * Update UI based on developer mode state
 */
function updateDeveloperModeUI() {
  const devMode = settings.developerMode === true;
  
  // Show/hide protocols fields in add and edit forms
  const addProtocolsGroup = document.getElementById('add-protocols-group');
  const editProtocolsGroup = document.getElementById('edit-protocols-group');
  
  if (addProtocolsGroup) {
    addProtocolsGroup.style.display = devMode ? 'flex' : 'none';
  }
  if (editProtocolsGroup) {
    editProtocolsGroup.style.display = devMode ? 'flex' : 'none';
  }
}

/**
 * Handle clear stats
 */
async function handleClearStats() {
  if (!confirm('Are you sure you want to clear all statistics?')) {
    return;
  }

  try {
    await storage.local.set({ usage_stats: { interceptCount: 0, walletUses: {} } });
    await loadData();
    renderStats();
    showNotification('Statistics cleared', 'success');
  } catch (error) {
    console.error('Failed to clear stats:', error);
    showNotification('Failed to clear statistics', 'error');
  }
}

/**
 * Handle export configuration
 */
function handleExportConfig() {
  const config = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    wallets: wallets,
    settings: settings
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wallet-config-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Configuration exported', 'success');
}

/**
 * Handle import configuration
 */
async function handleImportConfig(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const config = JSON.parse(text);

    if (!config.wallets || !Array.isArray(config.wallets)) {
      throw new Error('Invalid configuration format');
    }

    if (!confirm(`This will import ${config.wallets.length} wallet(s). Continue?`)) {
      return;
    }

    // Merge with existing wallets, avoiding duplicates
    config.wallets.forEach(importedWallet => {
      const exists = wallets.some(w => w.url === importedWallet.url);
      if (!exists) {
        wallets.push({
          ...importedWallet,
          id: generateId() // Regenerate ID to avoid conflicts
        });
      }
    });

    await saveWallets();
    renderAll();
    showNotification(`Imported ${config.wallets.length} wallet(s)`, 'success');
  } catch (error) {
    console.error('Failed to import config:', error);
    showNotification('Failed to import configuration', 'error');
  }

  e.target.value = ''; // Reset file input
}

/**
 * Save wallets to storage
 */
async function saveWallets() {
  try {
    await runtime.sendMessage({ type: 'SAVE_WALLETS', wallets: wallets });
  } catch (error) {
    console.error('Failed to save wallets:', error);
    showNotification('Failed to save changes', 'error');
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    await runtime.sendMessage({ 
      type: 'SAVE_SETTINGS', 
      enabled: settings.enabled,
      developerMode: settings.developerMode
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    showNotification('Failed to save settings', 'error');
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return 'wallet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#1C4587'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);
