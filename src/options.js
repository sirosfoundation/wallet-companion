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
  document.querySelectorAll('.tab-btn').forEach(tab => {
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
  document.getElementById('delete-edit').addEventListener('click', handleDeleteEdit);
  document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
  document.getElementById('close-edit').addEventListener('click', closeEditModal);
  document.getElementById('save-edit').addEventListener('click', handleSaveEdit);
  document.getElementById('edit-wallet-enabled').addEventListener('change', updateWalletStatusLabel);

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
  // Add form icon selector - emoji buttons
  const iconGrid = document.getElementById('icon-emoji-grid');
  if (iconGrid) {
    iconGrid.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        selectIcon('emoji', this.dataset.emoji);
      });
    });
  }
  
  // Add form favicon button
  const faviconBtn = document.getElementById('favicon-option');
  if (faviconBtn) {
    faviconBtn.addEventListener('click', function() {
      const faviconImg = document.getElementById('favicon-img');
      if (faviconImg && faviconImg.src) {
        selectIcon('favicon', faviconImg.src);
      }
    });
  }

  // Edit form icon selector - emoji buttons
  const editIconGrid = document.getElementById('edit-icon-emoji-grid');
  if (editIconGrid) {
    editIconGrid.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        selectEditIcon('emoji', this.dataset.emoji);
      });
    });
  }
  
  // Edit form favicon button
  const editFaviconBtn = document.getElementById('edit-favicon-option');
  if (editFaviconBtn) {
    editFaviconBtn.addEventListener('click', function() {
      const faviconImg = document.getElementById('edit-favicon-img');
      if (faviconImg && faviconImg.src) {
        selectEditIcon('favicon', faviconImg.src);
      }
    });
  }

  // URL input listener for favicon fetching
  const urlInput = document.getElementById('wallet-url');
  const nameInput = document.getElementById('wallet-name');
  
  if (urlInput) {
    urlInput.addEventListener('blur', handleUrlChange);
    urlInput.addEventListener('change', handleUrlChange);
  }
  
  if (nameInput) {
    nameInput.addEventListener('input', debounce(handleNameChange, 300));
  }
  
  // Edit form URL and name listeners  
  const editUrlInput = document.getElementById('edit-wallet-url');
  const editNameInput = document.getElementById('edit-wallet-name');
  
  if (editUrlInput) {
    editUrlInput.addEventListener('blur', handleEditUrlChange);
    editUrlInput.addEventListener('change', handleEditUrlChange);
  }
  
  if (editNameInput) {
    editNameInput.addEventListener('input', debounce(handleEditNameChange, 300));
  }
}

/**
 * Debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Handle URL input change - fetch favicon and generate icons
 */
async function handleUrlChange() {
  const url = document.getElementById('wallet-url').value.trim();
  const name = document.getElementById('wallet-name').value.trim();
  
  if (!url) return;
  if (!window.iconUtils) {
    console.error('Icon utilities not loaded');
    return;
  }
  
  const iconOptions = document.getElementById('icon-options');
  const generatedIconsContainer = document.getElementById('generated-icons');
  
  // Generate and render icons
  const generatedIcons = generateIconsArray(url, name);
  renderIconButtons(generatedIconsContainer, generatedIcons, selectIcon);
  
  // Auto-select first generated icon
  selectIcon(generatedIcons[0].type, generatedIcons[0].value);
  
  // Fetch favicon in background
  await fetchAndDisplayFavicon(url, {
    section: document.getElementById('favicon-section'),
    img: document.getElementById('favicon-img'),
    status: document.getElementById('favicon-status')
  }, (favicon) => selectIcon('favicon', favicon));

  iconOptions.classList.remove('_hidden');
}

/**
 * Handle name input change - regenerate icons
 */
function handleNameChange() {
  const url = document.getElementById('wallet-url').value.trim();
  const name = document.getElementById('wallet-name').value.trim();
  
  if (!name || !window.iconUtils) return;
  
  const generatedIconsContainer = document.getElementById('generated-icons');
  const generatedIcons = generateIconsArray(url, name);
  renderIconButtons(generatedIconsContainer, generatedIcons, selectIcon);
}

/**
 * Generate icon options for the edit form
 */
async function generateEditIconOptions(url, name, currentIcon, currentIconType) {
  if (!window.iconUtils) {
    console.error('Icon utilities not loaded');
    return;
  }
  
  const iconOptions = document.getElementById('edit-icon-options');
  const generatedIconsContainer = document.getElementById('edit-generated-icons');
  const preview = document.getElementById('edit-icon-preview');
  
  // Generate and render icons
  const generatedIcons = generateIconsArray(url, name);
  renderIconButtons(generatedIconsContainer, generatedIcons, selectEditIcon);
  
  // Show icon options
  iconOptions.classList.remove('_hidden');
  
  // Fetch favicon in background
  if (url) {
    await fetchAndDisplayFavicon(url, {
      section: document.getElementById('edit-favicon-section'),
      img: document.getElementById('edit-favicon-img'),
      status: document.getElementById('edit-favicon-status')
    }, (favicon) => {
      // If current icon is favicon type, select it
      if (currentIconType === 'favicon') {
        selectEditIcon('favicon', favicon);
      }
    });
  }
  
  // Select current icon
  if (currentIcon) {
    if (currentIconType === 'emoji' || !isIconUrl(currentIcon)) {
      selectEditIcon('emoji', currentIcon);
    } else if (currentIconType && currentIconType !== 'favicon') {
      // It's a generated icon type - select matching generated icon
      selectEditIcon(currentIconType, currentIcon);
    } else if (currentIconType !== 'favicon') {
      // Default: show the current icon in preview but don't select anything
      if (isIconUrl(currentIcon)) {
        preview.innerHTML = `<img src="${currentIcon}" alt="Wallet icon">`;
      } else {
        preview.innerHTML = `<span style="font-size: 32px;">${currentIcon}</span>`;
      }
    }
  }
}

/**
 * Handle URL change in edit form - regenerate icons
 */
async function handleEditUrlChange() {
  const url = document.getElementById('edit-wallet-url').value.trim();
  const name = document.getElementById('edit-wallet-name').value.trim();
  
  if (!url || !window.iconUtils) return;
  
  const generatedIconsContainer = document.getElementById('edit-generated-icons');
  const iconOptions = document.getElementById('edit-icon-options');
  
  // Generate and render icons
  const generatedIcons = generateIconsArray(url, name);
  renderIconButtons(generatedIconsContainer, generatedIcons, selectEditIcon);
  
  // Auto-select first generated icon
  selectEditIcon(generatedIcons[0].type, generatedIcons[0].value);
  
  // Fetch favicon in background
  await fetchAndDisplayFavicon(url, {
    section: document.getElementById('edit-favicon-section'),
    img: document.getElementById('edit-favicon-img'),
    status: document.getElementById('edit-favicon-status')
  }, (favicon) => selectEditIcon('favicon', favicon));
  
  iconOptions.classList.remove('_hidden');
}

/**
 * Handle name change in edit form - regenerate icons
 */
function handleEditNameChange() {
  const url = document.getElementById('edit-wallet-url').value.trim();
  const name = document.getElementById('edit-wallet-name').value.trim();
  
  if (!name || !window.iconUtils) return;
  
  const generatedIconsContainer = document.getElementById('edit-generated-icons');
  const generatedIcons = generateIconsArray(url, name);
  renderIconButtons(generatedIconsContainer, generatedIcons, selectEditIcon);
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.classList.toggle('-active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('-active', content.id === `${tabName}-tab`);
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
        <div class="icon">🔐</div>
        <div class="title">No wallets configured</div>
        <div class="text">Add your first digital wallet to get started</div>
        <button class="s-button empty-state-add-btn">Add Your First Wallet</button>
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
      <div class="add-card">
        <div class="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </div>
        <h3 class="title">Add Another Wallet</h3>
        <p class="description">Connect a new digital identity provider to your dashboard.</p>
      </div>
    </div>
  `;
  
  // Attach click handler for add another wallet card
  container.querySelector('.add-card').addEventListener('click', function() {
    switchTab('add');
  });

  // Attach event listeners to wallet actions
  wallets.forEach((wallet, index) => {
    const card = container.querySelector(`[data-wallet-id="${wallet.id}"]`);
    if (card) {
      card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(wallet));
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
      <div class="wallet-protocols" style="margin: 8px 0; padding: 8px; background: #f3f4f6; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">Protocols:</div>
        <div style="font-size: 11px; color: #374151;">${wallet.protocols.map(p => `<code style="background: white; padding: 2px 6px; border-radius: 3px; margin-right: 4px;">${escapeHtml(p)}</code>`).join('')}</div>
      </div>
    `;
  }
  
  // Render icon - handle both emoji and image icons
  let iconHtml;
  let icon = wallet.icon;
  
  // If icon is missing or is the default emoji, generate one dynamically
  if (!icon || icon === '🔐') {
    // Generate an identicon based on the wallet URL or name
    const identifier = wallet.url || wallet.name || wallet.id;
    try {
      // Use window.iconUtils for icon generation
      if (window.iconUtils && window.iconUtils.generateIdenticon && window.iconUtils.svgToDataUrl) {
        const svg = window.iconUtils.generateIdenticon(identifier);
        icon = window.iconUtils.svgToDataUrl(svg);
      } else {
        icon = '🔐'; // Fallback
      }
    } catch (e) {
      console.error('Icon generation failed:', e);
      icon = '🔐'; // Fallback to emoji if generation fails
    }
  }
  
  // Check if icon is a URL (data: or http)
  const iconIsUrl = icon && (icon.startsWith('data:') || icon.startsWith('http'));
  if (iconIsUrl) {
    iconHtml = `<img src="${escapeHtml(icon)}" alt="${escapeHtml(wallet.name)}" style="width: 32px; height: 32px; object-fit: contain;">`;
  } else {
    iconHtml = `<span class="wallet-emoji">${icon}</span>`;
  }
  
  return `
    <div class="wallet-card ${wallet.enabled ? '' : '-disabled'}" data-wallet-id="${wallet.id}">
      <div class="header">
        <div class="wallet-icon -large">
          ${iconHtml}
        </div>
        <div class="info">
          <div class="name">${escapeHtml(wallet.name)}</div>
          <div class="url">${escapeHtml(wallet.url)}</div>
        </div>
      </div>
      ${wallet.description ? `<div class="description">${escapeHtml(wallet.description)}</div>` : ''}
      
      ${protocolsDisplay}
      
      <div class="meta">
        ${wallet.enabled ? '<span class="badge-label -success">Active</span>' : '<span class="badge-label -warning">Disabled</span>'}
        ${isDefault ? '<span class="badge-label -info">Default</span>' : ''}
        ${wallet.preset ? '<span class="badge-label -info">wwWallet</span>' : ''}
        ${uses > 0 ? `<span class="badge-label -info">Used ${uses}x</span>` : ''}
      </div>
      
      <div class="actions">
        <div class="left">
          <label class="toggle-switch -large" title="${wallet.enabled ? 'Disable' : 'Enable'} wallet">
            <input type="checkbox" class="toggle-wallet" ${wallet.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <div class="right">
          <button class="s-button -secondary btn-edit">Edit</button>
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
      <div class="preset-card ${isAdded ? '-added' : ''}" data-preset='${JSON.stringify(preset)}'>
        <div class="icon">${preset.icon}</div>
        <div class="info">
          <div class="name">${escapeHtml(preset.name)}</div>
          ${isAdded 
            ? '<div class="status -added"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Added</div>'
            : '<div class="status">Click to add</div>'
          }
        </div>
        ${!isAdded ? '<button class="btn">Add</button>' : ''}
      </div>
    `;
  }).join('');

  // Attach click handlers
  container.querySelectorAll('.preset-card:not(.-added)').forEach(card => {
    card.querySelector('.btn').addEventListener('click', function(e) {
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
    iconType: document.getElementById('wallet-icon-type')?.value || 'emoji',
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
  resetIconSelector();
  
  renderAll();
  showNotification(`${wallet.name} added successfully`, 'success');
  switchTab('wallets');
}

/**
 * Reset the icon selector to default state
 */
function resetIconSelector() {
  const preview = document.getElementById('icon-preview');
  const iconOptions = document.getElementById('icon-options');
  const iconInput = document.getElementById('wallet-icon');
  const iconTypeInput = document.getElementById('wallet-icon-type');
  const faviconSection = document.getElementById('favicon-section');
  const generatedIcons = document.getElementById('generated-icons');
  
  // Clear all selections
  document.querySelectorAll('#icon-emoji-grid .emoji-btn').forEach(b => b.classList.remove('-selected'));
  
  // Reset preview
  if (preview) preview.innerHTML = '<span class="placeholder">?</span>';
  if (iconOptions) iconOptions.classList.add('_hidden');
  if (iconInput) iconInput.value = '';
  if (iconTypeInput) iconTypeInput.value = '';
  if (faviconSection) faviconSection.classList.add('_hidden');
  if (generatedIcons) generatedIcons.innerHTML = '';
}

/**
 * Open edit modal
 */
async function openEditModal(wallet) {
  document.getElementById('edit-wallet-id').value = wallet.id;
  document.getElementById('edit-wallet-name').value = wallet.name;
  document.getElementById('edit-wallet-url').value = wallet.url;
  document.getElementById('edit-wallet-description').value = wallet.description || '';
  document.getElementById('edit-wallet-icon').value = wallet.icon || '🔐';
  document.getElementById('edit-wallet-icon-type').value = wallet.iconType || 'emoji';
  document.getElementById('edit-wallet-enabled').checked = wallet.enabled;
  updateWalletStatusLabel();
  
  // Generate and display icon options
  await generateEditIconOptions(wallet.url, wallet.name, wallet.icon, wallet.iconType);
  
  // Populate protocols if developer mode is enabled
  if (settings.developerMode && wallet.protocols) {
    document.getElementById('edit-wallet-protocols').value = wallet.protocols.join('\n');
  } else {
    document.getElementById('edit-wallet-protocols').value = '';
  }
  
  // Ensure developer mode UI is updated for the modal
  updateDeveloperModeUI();
  
  document.getElementById('edit-modal').classList.add('-active');
}

/**
 * Handle delete wallet from edit modal
 */
async function handleDeleteEdit() {
  const walletId = document.getElementById('edit-wallet-id').value;
  await handleDeleteWallet(walletId);
  closeEditModal();
}

/**
 * Update the wallet status label based on toggle state
 */
function updateWalletStatusLabel() {
  const enabled = document.getElementById('edit-wallet-enabled').checked;
  document.getElementById('edit-wallet-status').textContent = enabled ? 'Enabled' : 'Disabled';
}

/**
 * Close edit modal
 */
function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('-active');
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
    iconType: document.getElementById('edit-wallet-icon-type')?.value || 'emoji',
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
    addProtocolsGroup.classList.toggle('_hidden', !devMode);
  }
  if (editProtocolsGroup) {
    editProtocolsGroup.classList.toggle('_hidden', !devMode);
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
 * 
 * @param {string} message - The message to display
 * @param {'success' | 'error' | 'warning' | 'info'} type - The type of notification
 */
function showNotification(message, type = 'info') {
  const types = {
    success: {
      title: 'Success!',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>'
    },
    error: {
      title: 'Error!',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
    },
    warning: {
      title: 'Warning!',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
    },
    info: {
      title: 'Info',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    }
  }

  const toast = document.createElement('div');
  toast.className = `toast-item -${type}`;
  toast.innerHTML = `
    <span class="icon">${types[type]?.icon || types.info.icon}</span>
    <div class="body">
      <div class="title">${types[type]?.title || types.info.title}</div>
      <div class="message">${escapeHtml(message)}</div>
    </div>
    <button class="close" aria-label="Close">&times;</button>
  `;

  toast.querySelector('.close').addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  });

  const container = document.getElementById('toast-container');
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// Icon Selector Helpers (shared between add and edit forms)
// ============================================================================

/**
 * Generate icon options array from URL and name
 * @param {string} url - Wallet URL (used for identicon/geometric generation)
 * @param {string} name - Wallet name (used for initial avatar)
 * @returns {Array<{type: string, value: string}>} Array of icon options
 */
function generateIconsArray(url, name) {
  const iu = window.iconUtils;
  if (!iu) return [];
  
  const identifier = url || name || 'wallet';
  const walletName = name || 'Wallet';
  
  return [
    { type: 'identicon', value: iu.svgToDataUrl(iu.generateIdenticon(identifier)) },
    { type: 'initial', value: iu.svgToDataUrl(iu.generateInitialAvatar(walletName)) },
    { type: 'geometric-1', value: iu.svgToDataUrl(iu.generateGeometricIcon(identifier)) },
    { type: 'geometric-2', value: iu.svgToDataUrl(iu.generateGeometricIcon(identifier + '2')) }
  ];
}

/**
 * Render icon buttons into a container
 * @param {HTMLElement} container - Container to render buttons into
 * @param {Array<{type: string, value: string}>} icons - Array of icon options
 * @param {function} onSelect - Callback when an icon is selected: (type, value) => void
 */
function renderIconButtons(container, icons, onSelect) {
  container.innerHTML = '';
  icons.forEach((iconData) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-option';
    btn.dataset.type = iconData.type;
    btn.dataset.value = iconData.value;
    btn.title = iconData.type;
    btn.innerHTML = `<img src="${iconData.value}" alt="${iconData.type}">`;
    btn.addEventListener('click', () => onSelect(iconData.type, iconData.value));
    container.appendChild(btn);
  });
}

/**
 * Fetch and display favicon with validation
 * @param {string} url - URL to fetch favicon from
 * @param {Object} elements - DOM elements { section, img, status }
 * @param {function} onSuccess - Callback when favicon loads: (faviconUrl) => void
 */
async function fetchAndDisplayFavicon(url, elements, onSuccess) {
  const { section, img, status } = elements;
  const iu = window.iconUtils;
  
  // Reset state
  section.classList.add('_hidden');
  status.innerHTML = '';
  
  if (!url || !iu) return;
  
  try {
    const favicon = await iu.fetchFavicon(url, 2000);
    if (favicon) {
      // Validate image actually loads
      const testImg = new Image();
      testImg.onload = () => {
        section.classList.remove('_hidden');
        img.src = favicon;
        onSuccess(favicon);
      };
      testImg.onerror = () => {
        section.classList.add('_hidden');
      };
      testImg.src = favicon;
    }
  } catch (e) {
    console.log('Favicon fetch failed:', e);
  }
}

/**
 * Select an icon in a form (unified for both add and edit forms)
 * @param {string} prefix - Element ID prefix ('' for add form, 'edit-' for edit form)
 * @param {string} type - Icon type: 'emoji', 'favicon', or generated type
 * @param {string} value - Icon value (emoji char or data URL)
 */
function selectIconInForm(prefix, type, value) {
  const preview = document.getElementById(`${prefix}icon-preview`);
  const iconInput = document.getElementById(`${prefix}wallet-icon`);
  const iconTypeInput = document.getElementById(`${prefix}wallet-icon-type`);
  
  // Build selectors for this form
  const emojiSelector = `#${prefix}icon-emoji-grid .emoji-btn`;
  const generatedSelector = `#${prefix}generated-icons .icon-option`;
  const faviconSelector = `#${prefix}favicon-option`;
  
  // Clear all selections
  document.querySelectorAll(`${emojiSelector}, ${generatedSelector}, ${faviconSelector}`).forEach(btn => {
    btn.classList.remove('-selected');
  });
  
  // Update preview and inputs
  if (type === 'emoji') {
    preview.innerHTML = `<span style="font-size: 32px;">${value}</span>`;
    iconInput.value = value;
    if (iconTypeInput) iconTypeInput.value = 'emoji';
    
    const emojiBtn = document.querySelector(`${emojiSelector}[data-emoji="${CSS.escape(value)}"]`);
    if (emojiBtn) emojiBtn.classList.add('-selected');
  } else if (type === 'favicon') {
    preview.innerHTML = `<img src="${value}" alt="Wallet icon">`;
    iconInput.value = value;
    if (iconTypeInput) iconTypeInput.value = 'favicon';
    
    const faviconBtn = document.getElementById(`${prefix}favicon-option`);
    if (faviconBtn) faviconBtn.classList.add('-selected');
  } else {
    // Generated icons (identicon, initial, geometric)
    preview.innerHTML = `<img src="${value}" alt="Wallet icon">`;
    iconInput.value = value;
    if (iconTypeInput) iconTypeInput.value = type;
    
    const genBtn = document.querySelector(`${generatedSelector}[data-value="${CSS.escape(value)}"]`);
    if (genBtn) genBtn.classList.add('-selected');
  }
}

// Convenience wrappers for backward compatibility
function selectIcon(type, value) {
  selectIconInForm('', type, value);
}

function selectEditIcon(type, value) {
  selectIconInForm('edit-', type, value);
}
