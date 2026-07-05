/**
 * Wallet selection modal
 * Injected into pages when a Digital Credentials API call is intercepted
 */

(function() {
  'use strict';

  console.log('[modal.js] Loading wallet selector modal');

  // Create modal HTML
  const modalHTML = `
    <div id="dc-wallet-modal-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    ">
      <div id="dc-wallet-modal" style="
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        max-width: 480px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      ">
        <!-- Header -->
        <div style="
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        ">
          <h2 style="
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #000000;
          ">Select Digital Wallet</h2>
          <p style="
            margin: 8px 0 0 0;
            font-size: 14px;
            color: #6e7582;
          ">Choose which wallet to use for this credential request</p>
        </div>

        <!-- Content -->
        <div id="dc-wallet-list" style="
          padding: 16px 24px;
          overflow-y: auto;
          flex: 1;
        ">
          <!-- Wallets will be inserted here -->
        </div>

        <!-- Footer -->
        <div style="
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        ">
          <button id="dc-wallet-native" style="
            padding: 8px 16px;
            background: #f8f9f9;
            border: 1px solid #6e7582;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #000000;
            cursor: pointer;
          ">Use Browser Wallet</button>
          <button id="dc-wallet-cancel" style="
            padding: 8px 16px;
            background: #f8f9f9;
            border: 1px solid #6e7582;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #000000;
            cursor: pointer;
          ">Cancel</button>
        </div>
      </div>
    </div>
  `;

  /**
   * Show wallet selection modal
   * @param {Array} wallets - List of configured wallets
   * @param {Function} onSelect - Callback when wallet is selected
   * @param {Function} onNative - Callback when native browser wallet is chosen
   * @param {Function} onCancel - Callback when cancelled
   */
  window.showWalletSelector = function(wallets, onSelect, onNative, onCancel) {
    console.log('[modal.js] showWalletSelector called with', wallets);
    // Remove any existing modal
    const existing = document.getElementById('dc-wallet-modal-overlay');
    if (existing) {
      existing.remove();
    }

    // Create modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    const modal = modalContainer.firstElementChild;
    document.body.appendChild(modal);

    // Get wallet list container
    const walletList = document.getElementById('dc-wallet-list');

    // Add wallets to the list
    if (wallets && wallets.length > 0) {
      wallets.forEach((wallet, index) => {
        const walletItem = document.createElement('div');
        walletItem.style.cssText = `
          padding: 16px;
          margin-bottom: 8px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
        `;
        
        walletItem.innerHTML = `
          <div style="
            width: 48px;
            height: 48px;
            background: #e8e9ea;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          ">${wallet.icon || '🔐'}</div>
          <div style="flex: 1;">
            <div style="
              font-weight: 500;
              font-size: 14px;
              color: #000000;
              margin-bottom: 4px;
            ">${escapeHtml(wallet.name)}</div>
            <div style="
              font-size: 12px;
              color: #6e7582;
            ">${escapeHtml(wallet.description || wallet.url || 'Digital Identity Wallet')}</div>
          </div>
        `;

        // Hover effects
        walletItem.addEventListener('mouseenter', function() {
          this.style.borderColor = '#1C4587';
          this.style.backgroundColor = '#f0f9ff';
        });
        
        walletItem.addEventListener('mouseleave', function() {
          this.style.borderColor = '#e5e7eb';
          this.style.backgroundColor = 'transparent';
        });

        // Click handler
        walletItem.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent bubbling to overlay
          modal.remove();
          onSelect(wallet);
        });

        walletList.appendChild(walletItem);
      });
    } else {
      walletList.innerHTML = `
        <div style="
          text-align: center;
          padding: 32px;
          color: #6e7582;
        ">
          <p style="margin: 0 0 16px 0; font-size: 14px;">No wallets configured</p>
          <p style="margin: 0; font-size: 12px;">Use the extension settings to add wallet providers</p>
        </div>
      `;
    }

    // Button handlers
    document.getElementById('dc-wallet-native').addEventListener('click', function(e) {
      e.stopPropagation();
      modal.remove();
      onNative();
    });

    document.getElementById('dc-wallet-cancel').addEventListener('click', function(e) {
      e.stopPropagation();
      modal.remove();
      onCancel();
    });

    // ESC key handler
    function handleEscape(e) {
      if (e.key === 'Escape') {
        modal.remove();
        onCancel();
        document.removeEventListener('keydown', handleEscape);
      }
    }
    document.addEventListener('keydown', handleEscape);

    // Click outside to close
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
        onCancel();
      }
    });
  };

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

  console.log('[modal.js] Wallet selector modal loaded, window.showWalletSelector =', typeof window.showWalletSelector);

  // Listen for show wallet selector events from content script
  window.addEventListener('DC_SHOW_WALLET_SELECTOR', function(event) {
    console.log('[modal.js] Received DC_SHOW_WALLET_SELECTOR event:', event.detail);
    const { requestId, wallets, requests } = event.detail;
    
    window.showWalletSelector(
      wallets,
      // On wallet selected
      (wallet) => {
        console.log('[modal.js] Wallet selected:', wallet.name);
        
        // Find matching request for this wallet's protocols
        const selectedRequest = requests.find(req => 
          wallet.protocols && wallet.protocols.includes(req.protocol)
        ) || requests[0]; // fallback to first request
        
        // Notify content script which will forward to background
        window.dispatchEvent(new CustomEvent('DC_WALLET_SELECTED', {
          detail: {
            requestId: requestId,
            walletId: wallet.id,
            wallet: wallet,
            protocol: selectedRequest.protocol,
            selectedRequest: selectedRequest
          }
        }));
      },
      // On native browser wallet chosen
      () => {
        console.log('[modal.js] Using native browser wallet');
        window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_RESPONSE', {
          detail: {
            requestId: requestId,
            useNative: true
          }
        }));
      },
      // On cancel
      () => {
        console.log('[modal.js] Wallet selection cancelled');
        window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_RESPONSE', {
          detail: {
            requestId: requestId,
            error: 'User cancelled the request'
          }
        }));
      }
    );
  });

})();
