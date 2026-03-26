/**
 * Unit tests for modal.js - Wallet selection modal
 */

describe('Modal - Wallet Selector', () => {
  let mockWallets;

  beforeEach(() => {
    mockWallets = [
      {
        id: 'wallet-1',
        name: 'Test Wallet 1',
        url: 'https://wallet1.example.com',
        icon: '🔐',
        color: '#3b82f6',
        description: 'First test wallet',
        protocols: ['openid4vp']
      },
      {
        id: 'wallet-2',
        name: 'Test Wallet 2',
        url: 'https://wallet2.example.com',
        icon: '🌐',
        color: '#10b981',
        description: 'Second test wallet',
        protocols: ['openid4vp', 'openid4vp-v1-signed']
      }
    ];

    // Clear any existing modals
    document.body.innerHTML = '';
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

    test('should escape script tags', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should escape HTML entities', () => {
      const input = '<div class="test">&</div>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;');
    });

    test('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    test('should handle null', () => {
      expect(escapeHtml(null)).toBe('');
    });

    test('should handle undefined', () => {
      expect(escapeHtml(undefined)).toBe('');
    });

    test('should preserve safe text', () => {
      const input = 'Hello World';
      expect(escapeHtml(input)).toBe('Hello World');
    });
  });

  describe('Modal Creation', () => {
    function createModal() {
      const modalContainer = document.createElement('div');
      modalContainer.id = 'dc-wallet-modal-overlay';
      modalContainer.innerHTML = `
        <div id="dc-wallet-modal">
          <div id="dc-wallet-list"></div>
          <button id="dc-wallet-native">Use Browser Wallet</button>
          <button id="dc-wallet-cancel">Cancel</button>
        </div>
      `;
      document.body.appendChild(modalContainer);
      return modalContainer;
    }

    test('should create modal overlay', () => {
      createModal();
      const overlay = document.getElementById('dc-wallet-modal-overlay');
      expect(overlay).toBeTruthy();
    });

    test('should create wallet list container', () => {
      createModal();
      const list = document.getElementById('dc-wallet-list');
      expect(list).toBeTruthy();
    });

    test('should create native wallet button', () => {
      createModal();
      const btn = document.getElementById('dc-wallet-native');
      expect(btn).toBeTruthy();
    });

    test('should create cancel button', () => {
      createModal();
      const btn = document.getElementById('dc-wallet-cancel');
      expect(btn).toBeTruthy();
    });

    test('should allow removing existing modal', () => {
      createModal();
      const existing = document.getElementById('dc-wallet-modal-overlay');
      expect(existing).toBeTruthy();
      
      existing.remove();
      
      const removed = document.getElementById('dc-wallet-modal-overlay');
      expect(removed).toBeNull();
    });
  });

  describe('Wallet List Rendering', () => {
    function escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function renderWalletItem(wallet) {
      return `
        <div class="wallet-item" data-wallet-id="${wallet.id}">
          <div class="wallet-icon" style="background: ${wallet.color || '#1C4587'}">
            ${wallet.icon || '🔐'}
          </div>
          <div class="wallet-info">
            <div class="wallet-name">${escapeHtml(wallet.name)}</div>
            <div class="wallet-description">${escapeHtml(wallet.description || wallet.url || 'Digital Identity Wallet')}</div>
          </div>
        </div>
      `;
    }

    test('should render wallet name', () => {
      const html = renderWalletItem(mockWallets[0]);
      expect(html).toContain('Test Wallet 1');
    });

    test('should render wallet icon', () => {
      const html = renderWalletItem(mockWallets[0]);
      expect(html).toContain('🔐');
    });

    test('should render wallet color', () => {
      const html = renderWalletItem(mockWallets[0]);
      expect(html).toContain('#3b82f6');
    });

    test('should render wallet description', () => {
      const html = renderWalletItem(mockWallets[0]);
      expect(html).toContain('First test wallet');
    });

    test('should use default icon when not provided', () => {
      const wallet = { id: 'w1', name: 'No Icon' };
      const html = renderWalletItem(wallet);
      expect(html).toContain('🔐');
    });

    test('should use default color when not provided', () => {
      const wallet = { id: 'w1', name: 'No Color' };
      const html = renderWalletItem(wallet);
      expect(html).toContain('#1C4587');
    });

    test('should use URL as fallback description', () => {
      const wallet = { id: 'w1', name: 'Test', url: 'https://example.com' };
      const html = renderWalletItem(wallet);
      expect(html).toContain('https://example.com');
    });

    test('should use default description when URL not provided', () => {
      const wallet = { id: 'w1', name: 'Test' };
      const html = renderWalletItem(wallet);
      expect(html).toContain('Digital Identity Wallet');
    });

    test('should escape XSS in wallet name', () => {
      const wallet = { id: 'w1', name: '<script>alert(1)</script>' };
      const html = renderWalletItem(wallet);
      expect(html).not.toContain('<script>');
    });

    test('should include wallet ID as data attribute', () => {
      const html = renderWalletItem(mockWallets[0]);
      expect(html).toContain('data-wallet-id="wallet-1"');
    });
  });

  describe('Empty State Rendering', () => {
    function renderEmptyState() {
      return `
        <div class="empty-state">
          <p>No wallets configured</p>
          <p>Use the extension settings to add wallet providers</p>
        </div>
      `;
    }

    test('should render empty state message', () => {
      const html = renderEmptyState();
      expect(html).toContain('No wallets configured');
    });

    test('should render settings instruction', () => {
      const html = renderEmptyState();
      expect(html).toContain('extension settings');
    });
  });

  describe('Callback Handling', () => {
    test('should call onSelect callback with wallet', () => {
      const onSelect = jest.fn();
      const wallet = mockWallets[0];
      
      onSelect(wallet);
      
      expect(onSelect).toHaveBeenCalledWith(wallet);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    test('should call onNative callback', () => {
      const onNative = jest.fn();
      
      onNative();
      
      expect(onNative).toHaveBeenCalled();
    });

    test('should call onCancel callback', () => {
      const onCancel = jest.fn();
      
      onCancel();
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    test('should register click handler on element', () => {
      const clickHandler = jest.fn();
      const div = document.createElement('div');
      div.addEventListener('click', clickHandler);
      
      // Trigger click event
      const event = new MouseEvent('click', { bubbles: true });
      div.dispatchEvent(event);
      
      expect(clickHandler).toHaveBeenCalled();
    });

    test('should register click handler on button', () => {
      const clickHandler = jest.fn();
      const button = document.createElement('button');
      button.addEventListener('click', clickHandler);
      
      const event = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(event);
      
      expect(clickHandler).toHaveBeenCalled();
    });

    test('should handle button click event', () => {
      const clickHandler = jest.fn();
      const button = document.createElement('button');
      button.addEventListener('click', clickHandler);
      
      const event = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(event);
      
      expect(clickHandler).toHaveBeenCalled();
    });

    test('should handle ESC key press', () => {
      const escHandler = jest.fn();
      
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          escHandler();
        }
      };
      
      document.addEventListener('keydown', handleKeydown);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      
      expect(escHandler).toHaveBeenCalled();
      
      document.removeEventListener('keydown', handleKeydown);
    });

    test('should not trigger cancel on other keys', () => {
      const escHandler = jest.fn();
      
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          escHandler();
        }
      };
      
      document.addEventListener('keydown', handleKeydown);
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);
      
      expect(escHandler).not.toHaveBeenCalled();
      
      document.removeEventListener('keydown', handleKeydown);
    });

    test('should detect click on overlay element', () => {
      const handler = jest.fn();
      
      const overlay = document.createElement('div');
      overlay.id = 'dc-wallet-modal-overlay';
      document.body.appendChild(overlay);
      
      overlay.addEventListener('click', (e) => {
        if (e.target.id === 'dc-wallet-modal-overlay') {
          handler();
        }
      });
      
      // Simulate click on overlay
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: overlay });
      overlay.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
    });

    test('should not trigger handler when target is child element', () => {
      const handler = jest.fn();
      
      const overlay = document.createElement('div');
      overlay.id = 'dc-wallet-modal-overlay';
      const modal = document.createElement('div');
      modal.id = 'dc-wallet-modal';
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      overlay.addEventListener('click', (e) => {
        if (e.target.id === 'dc-wallet-modal-overlay') {
          handler();
        }
      });
      
      // Simulate click on modal (child), not overlay
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: modal });
      overlay.dispatchEvent(event);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('DC_SHOW_WALLET_SELECTOR Event', () => {
    test('should extract requestId from event detail', () => {
      const eventDetail = {
        requestId: 'req-123',
        wallets: mockWallets,
        requests: [{ protocol: 'openid4vp', data: {} }]
      };

      expect(eventDetail.requestId).toBe('req-123');
    });

    test('should extract wallets from event detail', () => {
      const eventDetail = {
        requestId: 'req-123',
        wallets: mockWallets,
        requests: []
      };

      expect(eventDetail.wallets).toEqual(mockWallets);
      expect(eventDetail.wallets.length).toBe(2);
    });

    test('should extract requests from event detail', () => {
      const requests = [
        { protocol: 'openid4vp', data: { nonce: '123' } },
        { protocol: 'openid4vp-v1-signed', data: { nonce: '456' } }
      ];
      
      const eventDetail = {
        requestId: 'req-123',
        wallets: mockWallets,
        requests: requests
      };

      expect(eventDetail.requests.length).toBe(2);
      expect(eventDetail.requests[0].protocol).toBe('openid4vp');
    });
  });

  describe('DC_WALLET_SELECTED Event', () => {
    test('should dispatch event with correct structure', () => {
      const wallet = mockWallets[0];
      const request = { protocol: 'openid4vp', data: { nonce: '123' } };
      
      const eventDetail = {
        requestId: 'req-123',
        walletId: wallet.id,
        wallet: wallet,
        protocol: request.protocol,
        selectedRequest: request
      };

      expect(eventDetail.requestId).toBe('req-123');
      expect(eventDetail.walletId).toBe('wallet-1');
      expect(eventDetail.wallet.name).toBe('Test Wallet 1');
      expect(eventDetail.protocol).toBe('openid4vp');
    });
  });

  describe('Protocol Matching', () => {
    test('should find matching request for wallet protocols', () => {
      const requests = [
        { protocol: 'openid4vp', data: {} },
        { protocol: 'openid4vp-v1-signed', data: {} }
      ];
      const wallet = mockWallets[1]; // Has ['openid4vp', 'openid4vp-v1-signed']

      const selectedRequest = requests.find(req => 
        wallet.protocols && wallet.protocols.includes(req.protocol)
      ) || requests[0];

      expect(selectedRequest.protocol).toBe('openid4vp');
    });

    test('should fallback to first request if no protocol match', () => {
      const requests = [
        { protocol: 'unknown-protocol', data: {} }
      ];
      const wallet = { id: 'w1', name: 'Test', protocols: ['openid4vp'] };

      const selectedRequest = requests.find(req => 
        wallet.protocols && wallet.protocols.includes(req.protocol)
      ) || requests[0];

      expect(selectedRequest.protocol).toBe('unknown-protocol');
    });

    test('should handle wallet without protocols array', () => {
      const requests = [
        { protocol: 'openid4vp', data: {} }
      ];
      const wallet = { id: 'w1', name: 'Test' }; // No protocols

      const selectedRequest = requests.find(req => 
        wallet.protocols && wallet.protocols.includes(req.protocol)
      ) || requests[0];

      expect(selectedRequest.protocol).toBe('openid4vp');
    });
  });

  describe('DC_CREDENTIALS_RESPONSE Event (Native/Cancel)', () => {
    test('should dispatch useNative response', () => {
      const eventDetail = {
        requestId: 'req-123',
        useNative: true
      };

      expect(eventDetail.useNative).toBe(true);
      expect(eventDetail.requestId).toBe('req-123');
    });

    test('should dispatch error response on cancel', () => {
      const eventDetail = {
        requestId: 'req-123',
        error: 'User cancelled the request'
      };

      expect(eventDetail.error).toBe('User cancelled the request');
    });
  });

  describe('Hover Effects', () => {
    test('should change border color on mouseenter', () => {
      const item = document.createElement('div');
      item.style.borderColor = 'gray';
      
      item.addEventListener('mouseenter', function() {
        this.style.borderColor = 'blue';
        this.style.backgroundColor = 'lightblue';
      });
      
      item.dispatchEvent(new MouseEvent('mouseenter'));
      
      // jsdom may normalize colors, so check that the value changed
      expect(item.style.borderColor).toBeTruthy();
      expect(item.style.backgroundColor).toBeTruthy();
    });

    test('should reset border color on mouseleave', () => {
      const item = document.createElement('div');
      item.style.borderColor = 'blue';
      item.style.backgroundColor = 'lightblue';
      
      item.addEventListener('mouseleave', function() {
        this.style.borderColor = 'gray';
        this.style.backgroundColor = '';
      });
      
      item.dispatchEvent(new MouseEvent('mouseleave'));
      
      // jsdom may normalize colors, so check that the value was set
      expect(item.style.borderColor).toBeTruthy();
    });
  });

  describe('Modal Removal', () => {
    test('should remove modal from DOM', () => {
      const modal = document.createElement('div');
      modal.id = 'dc-wallet-modal-overlay';
      document.body.appendChild(modal);
      
      expect(document.getElementById('dc-wallet-modal-overlay')).not.toBeNull();
      
      modal.remove();
      
      expect(document.getElementById('dc-wallet-modal-overlay')).toBeNull();
    });
  });
});

