/**
 * Background script for W3C Digital Credentials API interceptor
 * Manages wallet configuration and credential requests
 */

// Default wallets configuration
const DEFAULT_WALLETS = [
  {
    id: 'wallet-1',
    name: 'Example Wallet',
    url: 'https://wallet.example.com',
    protocols: ['openid4vp', 'w3c-vc'],
    icon: '🔐',
    color: '#1C4587',
    description: 'Example digital identity wallet',
    enabled: true
  }
];

// Storage keys
const STORAGE_KEYS = {
  WALLETS: 'configured_wallets',
  ENABLED: 'extension_enabled',
  DEVELOPER_MODE: 'developer_mode',
  STATS: 'usage_stats'
};

/**
 * Initialize extension
 */
async function initializeExtension() {
  const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
  
  // Initialize default settings if not exists
  const result = await storage.local.get([STORAGE_KEYS.WALLETS, STORAGE_KEYS.ENABLED]);
  
  if (!result[STORAGE_KEYS.WALLETS]) {
    await storage.local.set({ [STORAGE_KEYS.WALLETS]: DEFAULT_WALLETS });
  }
  
  if (result[STORAGE_KEYS.ENABLED] === undefined) {
    await storage.local.set({ [STORAGE_KEYS.ENABLED]: true });
  }
  
  console.log('Digital Credentials API Interceptor initialized');
}

// Initialize on install/startup
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(initializeExtension);
  chrome.runtime.onStartup.addListener(initializeExtension);
}

/**
 * Get configured wallets
 */
async function getConfiguredWallets() {
  const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
  const result = await storage.local.get(STORAGE_KEYS.WALLETS);
  return result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;
}

/**
 * Check if extension is enabled
 */
async function isExtensionEnabled() {
  const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
  const result = await storage.local.get(STORAGE_KEYS.ENABLED);
  return result[STORAGE_KEYS.ENABLED] !== false;
}

/**
 * Update usage statistics
 */
async function updateStats(action) {
  const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
  const result = await storage.local.get(STORAGE_KEYS.STATS);
  const stats = result[STORAGE_KEYS.STATS] || { interceptCount: 0, walletUses: {} };
  
  if (action === 'intercept') {
    stats.interceptCount = (stats.interceptCount || 0) + 1;
  } else if (action.startsWith('wallet:')) {
    const walletId = action.substring(7);
    stats.walletUses[walletId] = (stats.walletUses[walletId] || 0) + 1;
  }
  
  await storage.local.set({ [STORAGE_KEYS.STATS]: stats });
  
  // Notify popup if open
  const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
  runtime.sendMessage({ type: 'STATS_UPDATE', stats }).catch(() => {});
}

/**
 * Get all supported protocols from registered wallets
 */
async function getSupportedProtocols() {
  const wallets = await getConfiguredWallets();
  const enabledWallets = wallets.filter(w => w.enabled);
  
  // Collect all unique protocols
  const protocols = new Set();
  for (const wallet of enabledWallets) {
    if (wallet.protocols && Array.isArray(wallet.protocols)) {
      wallet.protocols.forEach(p => protocols.add(p));
    }
  }
  
  return Array.from(protocols);
}

/**
 * Get wallets that support a specific protocol
 */
async function getWalletsForProtocol(protocol) {
  const wallets = await getConfiguredWallets();
  return wallets.filter(w => 
    w.enabled && 
    w.protocols && 
    Array.isArray(w.protocols) && 
    w.protocols.includes(protocol)
  );
}

/**
 * Handle messages from content scripts
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
async function handleMessage(message, sender, sendResponse) {
  console.log('Received message:', message.type);
  
  try {
    if (message.type === 'SHOW_WALLET_SELECTOR') {
      // Check if extension is enabled
      const enabled = await isExtensionEnabled();
      if (!enabled) {
        sendResponse({ useNative: true });
        return true;
      }

      // Update statistics
      await updateStats('intercept');

      // Get configured wallets that support the requested protocols
      const allWallets = await getConfiguredWallets();
      const enabledWallets = allWallets.filter(w => w.enabled);
      
      // Filter wallets by protocols if requests specify protocols
      let matchingWallets = enabledWallets;
      if (message.requests && Array.isArray(message.requests)) {
        const requestedProtocols = message.requests.map(r => r.protocol);
        matchingWallets = enabledWallets.filter(wallet => 
          wallet.protocols && 
          Array.isArray(wallet.protocols) &&
          wallet.protocols.some(p => requestedProtocols.includes(p))
        );
      }

      // If no wallets support the requested protocols, fall back to native
      if (matchingWallets.length === 0) {
        console.log('No wallets support requested protocols, using native API');
        sendResponse({ useNative: true });
        return true;
      }

      // Inject modal and show wallet selector
      await injectWalletModal(sender.tab.id, sender.frameId);
      
      // Send matching wallets to content script
      sendResponse({ wallets: matchingWallets, requests: message.requests });
      return true;
    }
    
    else if (message.type === 'WALLET_SELECTED') {
      // Record wallet usage
      await updateStats(`wallet:${message.walletId}`);
      
      // Here you would handle the actual credential request to the wallet
      // For now, we'll just acknowledge
      sendResponse({ success: true });
      return true;
    }
    
    else if (message.type === 'GET_WALLETS') {
      const wallets = await getConfiguredWallets();
      sendResponse({ wallets });
      return true;
    }
    
    else if (message.type === 'SAVE_WALLETS') {
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      await storage.local.set({ [STORAGE_KEYS.WALLETS]: message.wallets });
      sendResponse({ success: true });
      return true;
    }
    
    else if (message.type === 'GET_SETTINGS') {
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      const result = await storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.DEVELOPER_MODE, STORAGE_KEYS.STATS]);
      sendResponse({
        enabled: result[STORAGE_KEYS.ENABLED] !== false,
        developerMode: result[STORAGE_KEYS.DEVELOPER_MODE] === true,
        stats: result[STORAGE_KEYS.STATS] || { interceptCount: 0, walletUses: {} }
      });
      return true;
    }
    
    else if (message.type === 'SAVE_SETTINGS') {
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      const updates = {};
      if (message.enabled !== undefined) {
        updates[STORAGE_KEYS.ENABLED] = message.enabled;
      }
      if (message.developerMode !== undefined) {
        updates[STORAGE_KEYS.DEVELOPER_MODE] = message.developerMode;
      }
      await storage.local.set(updates);
      sendResponse({ success: true });
      return true;
    }
    
    else if (message.type === 'TOGGLE_ENABLED') {
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      await storage.local.set({ [STORAGE_KEYS.ENABLED]: message.enabled });
      sendResponse({ success: true });
      return true;
    }
    
    else if (message.type === 'REGISTER_WALLET') {
      // Handle wallet auto-registration
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      const result = await storage.local.get(STORAGE_KEYS.WALLETS);
      let wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;
      
      // Check if wallet already exists (by URL)
      const existingWallet = wallets.find(w => w.url === message.wallet.url);
      
      if (existingWallet) {
        // Wallet already registered
        console.log('Wallet already registered:', message.wallet.url);
        sendResponse({
          success: true,
          alreadyRegistered: true,
          wallet: existingWallet
        });
        return true;
      }
      
      // Generate new wallet ID
      const walletId = 'wallet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Add wallet to the list
      const newWallet = {
        id: walletId,
        ...message.wallet,
        enabled: true,
        autoRegistered: true,
        registeredFrom: message.origin,
        registeredAt: new Date().toISOString()
      };
      
      wallets.push(newWallet);
      await storage.local.set({ [STORAGE_KEYS.WALLETS]: wallets });
      
      console.log('Wallet registered:', newWallet.name, 'from', message.origin);
      
      sendResponse({
        success: true,
        alreadyRegistered: false,
        wallet: newWallet
      });
      return true;
    }
    
    else if (message.type === 'CHECK_WALLET') {
      // Check if a wallet is registered
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      const result = await storage.local.get(STORAGE_KEYS.WALLETS);
      const wallets = result[STORAGE_KEYS.WALLETS] || DEFAULT_WALLETS;
      
      const isRegistered = wallets.some(w => w.url === message.url);
      
      sendResponse({ isRegistered: isRegistered });
      return true;
    }
    
    else if (message.type === 'GET_SUPPORTED_PROTOCOLS') {
      // Get all supported protocols
      const protocols = await getSupportedProtocols();
      sendResponse({ protocols: protocols });
      return true;
    }
    
    else if (message.type === 'CONTENT_SCRIPT_READY') {
      // Content script has loaded
      console.log('Content script ready on:', message.origin);
      sendResponse({ success: true });
      return true;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  
  return true; // Keep the message channel open for async responses
}

/**
 * Inject wallet modal into the page
 */
async function injectWalletModal(tabId, frameId) {
  const tabs = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;
  
  try {
    await tabs.executeScript(tabId, {
      file: 'modal.js',
      frameId: frameId || 0,
      runAt: 'document_end'
    });
  } catch (error) {
    console.error('Failed to inject modal:', error);
  }
}

// Listen for messages from content scripts
if (typeof browser !== 'undefined') {
  browser.runtime.onMessage.addListener(handleMessage);
} else if (typeof chrome !== 'undefined') {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep channel open for async
  });
}
