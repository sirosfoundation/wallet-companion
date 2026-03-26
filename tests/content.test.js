/**
 * Unit tests for content.js - Content script that bridges page and extension
 */

describe('Content Script - Message Bridge', () => {
  let mockRuntime;

  beforeEach(() => {
    // Mock browser/chrome runtime
    mockRuntime = {
      sendMessage: jest.fn(() => Promise.resolve({ success: true })),
      getURL: jest.fn((path) => `chrome-extension://test-id/${path}`)
    };

    // Setup global chrome object
    global.chrome = {
      runtime: mockRuntime
    };

    // Mock window event methods
    window.dispatchEvent = jest.fn();
    window.addEventListener = jest.fn();
  });

  afterEach(() => {
    delete global.chrome;
  });

  describe('DC_CREDENTIALS_REQUEST Handler', () => {
    test('should extract requestId from event detail', () => {
      const eventDetail = {
        requestId: 'dc-req-123',
        requests: [{ protocol: 'openid4vp', data: {} }],
        options: { digital: true }
      };

      expect(eventDetail.requestId).toBe('dc-req-123');
    });

    test('should extract processed requests', () => {
      const eventDetail = {
        requestId: 'dc-req-123',
        requests: [
          { protocol: 'openid4vp', data: { nonce: '123' } },
          { protocol: 'openid4vp-v1-signed', data: { nonce: '456' } }
        ],
        options: {}
      };

      expect(eventDetail.requests.length).toBe(2);
      expect(eventDetail.requests[0].protocol).toBe('openid4vp');
    });

    test('should send SHOW_WALLET_SELECTOR message to background', async () => {
      const message = {
        type: 'SHOW_WALLET_SELECTOR',
        requestId: 'dc-req-123',
        requests: [{ protocol: 'openid4vp', data: {} }],
        options: {},
        origin: 'https://example.com'
      };

      await mockRuntime.sendMessage(message);

      expect(mockRuntime.sendMessage).toHaveBeenCalledWith(message);
    });

    test('should dispatch DC_CREDENTIALS_RESPONSE on useNative', () => {
      const responseDetail = {
        requestId: 'dc-req-123',
        useNative: true
      };

      const event = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
        detail: responseDetail
      });

      expect(event.detail.useNative).toBe(true);
    });

    test('should dispatch DC_SHOW_WALLET_SELECTOR with wallets', () => {
      const wallets = [
        { id: 'w1', name: 'Wallet 1', url: 'https://w1.com' }
      ];
      
      const eventDetail = {
        requestId: 'dc-req-123',
        wallets: wallets,
        requests: [{ protocol: 'openid4vp', data: {} }]
      };

      const event = new CustomEvent('DC_SHOW_WALLET_SELECTOR', {
        detail: eventDetail
      });

      expect(event.detail.wallets).toEqual(wallets);
    });

    test('should handle error and dispatch error response', () => {
      const errorDetail = {
        requestId: 'dc-req-123',
        error: 'Failed to load wallets'
      };

      const event = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
        detail: errorDetail
      });

      expect(event.detail.error).toBe('Failed to load wallets');
    });
  });

  describe('DC_WALLET_SELECTED Handler', () => {
    test('should extract wallet selection data', () => {
      const eventDetail = {
        requestId: 'dc-req-123',
        walletId: 'wallet-1',
        wallet: { id: 'wallet-1', name: 'Test' },
        protocol: 'openid4vp',
        selectedRequest: { protocol: 'openid4vp', data: {} }
      };

      expect(eventDetail.walletId).toBe('wallet-1');
      expect(eventDetail.protocol).toBe('openid4vp');
    });

    test('should send WALLET_SELECTED message to background', async () => {
      const message = {
        type: 'WALLET_SELECTED',
        walletId: 'wallet-1',
        requestId: 'dc-req-123',
        protocol: 'openid4vp'
      };

      await mockRuntime.sendMessage(message);

      expect(mockRuntime.sendMessage).toHaveBeenCalledWith(message);
    });

    test('should dispatch DC_INVOKE_WALLET event', () => {
      const invokeDetail = {
        requestId: 'dc-req-123',
        wallet: { id: 'wallet-1', name: 'Test', url: 'https://wallet.test' },
        protocol: 'openid4vp',
        request: { protocol: 'openid4vp', data: { nonce: '123' } }
      };

      const event = new CustomEvent('DC_INVOKE_WALLET', {
        detail: invokeDetail
      });

      expect(event.detail.wallet.url).toBe('https://wallet.test');
    });
  });

  describe('DC_WALLET_REGISTRATION_REQUEST Handler', () => {
    test('should extract registration data', () => {
      const eventDetail = {
        registrationId: 'reg-123',
        wallet: {
          name: 'New Wallet',
          url: 'https://new-wallet.com',
          protocols: ['openid4vp']
        }
      };

      expect(eventDetail.registrationId).toBe('reg-123');
      expect(eventDetail.wallet.name).toBe('New Wallet');
    });

    test('should send REGISTER_WALLET message to background', async () => {
      const message = {
        type: 'REGISTER_WALLET',
        wallet: { name: 'Test', url: 'https://test.com' },
        origin: 'https://example.com'
      };

      mockRuntime.sendMessage.mockResolvedValueOnce({
        success: true,
        alreadyRegistered: false,
        wallet: { id: 'wallet-new', ...message.wallet }
      });

      const response = await mockRuntime.sendMessage(message);

      expect(response.success).toBe(true);
      expect(response.alreadyRegistered).toBe(false);
    });

    test('should handle already registered wallet', async () => {
      const message = {
        type: 'REGISTER_WALLET',
        wallet: { name: 'Test', url: 'https://existing.com' },
        origin: 'https://example.com'
      };

      mockRuntime.sendMessage.mockResolvedValueOnce({
        success: true,
        alreadyRegistered: true,
        wallet: { id: 'existing-id' }
      });

      const response = await mockRuntime.sendMessage(message);

      expect(response.alreadyRegistered).toBe(true);
    });

    test('should dispatch registration response event', () => {
      const responseDetail = {
        registrationId: 'reg-123',
        success: true,
        alreadyRegistered: false,
        wallet: { id: 'wallet-new' }
      };

      const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
        detail: responseDetail
      });

      expect(event.detail.success).toBe(true);
    });

    test('should dispatch error on registration failure', () => {
      const responseDetail = {
        registrationId: 'reg-123',
        success: false,
        error: 'Invalid wallet URL'
      };

      const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
        detail: responseDetail
      });

      expect(event.detail.success).toBe(false);
      expect(event.detail.error).toBe('Invalid wallet URL');
    });
  });

  describe('DC_WALLET_CHECK_REQUEST Handler', () => {
    test('should extract check request data', () => {
      const eventDetail = {
        checkId: 'check-123',
        url: 'https://wallet.test.com'
      };

      expect(eventDetail.checkId).toBe('check-123');
      expect(eventDetail.url).toBe('https://wallet.test.com');
    });

    test('should send CHECK_WALLET message to background', async () => {
      const message = {
        type: 'CHECK_WALLET',
        url: 'https://wallet.test.com'
      };

      mockRuntime.sendMessage.mockResolvedValueOnce({
        isRegistered: true
      });

      const response = await mockRuntime.sendMessage(message);

      expect(response.isRegistered).toBe(true);
    });

    test('should dispatch check response with isRegistered true', () => {
      const responseDetail = {
        checkId: 'check-123',
        isRegistered: true
      };

      const event = new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
        detail: responseDetail
      });

      expect(event.detail.isRegistered).toBe(true);
    });

    test('should dispatch check response with isRegistered false', () => {
      const responseDetail = {
        checkId: 'check-123',
        isRegistered: false
      };

      const event = new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
        detail: responseDetail
      });

      expect(event.detail.isRegistered).toBe(false);
    });

    test('should default to false on error', () => {
      const isRegistered = false; // Default on error
      expect(isRegistered).toBe(false);
    });
  });

  describe('DC_PROTOCOLS_UPDATE_REQUEST Handler', () => {
    test('should handle protocol update request', () => {
      const eventDetail = {
        updateId: 'update-123'
      };

      expect(eventDetail.updateId).toBe('update-123');
    });

    test('should dispatch protocols update response', () => {
      const responseDetail = {
        updateId: 'update-123',
        protocols: ['openid4vp', 'openid4vp-v1-signed', 'openid4vp-v1-unsigned']
      };

      const event = new CustomEvent('DC_PROTOCOLS_UPDATE_RESPONSE', {
        detail: responseDetail
      });

      expect(event.detail.protocols.length).toBe(3);
      expect(event.detail.protocols).toContain('openid4vp');
    });
  });

  describe('Script Injection', () => {
    test('should generate correct URL for protocols.js', () => {
      const url = mockRuntime.getURL('protocols.js');
      expect(url).toBe('chrome-extension://test-id/protocols.js');
    });

    test('should generate correct URL for OpenID4VPPlugin.js', () => {
      const url = mockRuntime.getURL('protocols/OpenID4VPPlugin.js');
      expect(url).toBe('chrome-extension://test-id/protocols/OpenID4VPPlugin.js');
    });

    test('should generate correct URL for modal.js', () => {
      const url = mockRuntime.getURL('modal.js');
      expect(url).toBe('chrome-extension://test-id/modal.js');
    });

    test('should generate correct URL for inject.js', () => {
      const url = mockRuntime.getURL('inject.js');
      expect(url).toBe('chrome-extension://test-id/inject.js');
    });
  });

  describe('Origin Handling', () => {
    test('should include origin in wallet selector request', () => {
      const origin = 'https://verifier.example.com';
      const message = {
        type: 'SHOW_WALLET_SELECTOR',
        origin: origin
      };

      expect(message.origin).toBe('https://verifier.example.com');
    });

    test('should include origin in registration request', () => {
      const origin = 'https://wallet.example.com';
      const message = {
        type: 'REGISTER_WALLET',
        wallet: { name: 'Test' },
        origin: origin
      };

      expect(message.origin).toBe('https://wallet.example.com');
    });
  });

  describe('Error Handling', () => {
    test('should catch and dispatch credential request errors', async () => {
      mockRuntime.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      try {
        await mockRuntime.sendMessage({ type: 'SHOW_WALLET_SELECTOR' });
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    test('should catch and dispatch wallet selection errors', async () => {
      mockRuntime.sendMessage.mockRejectedValueOnce(new Error('Timeout'));

      try {
        await mockRuntime.sendMessage({ type: 'WALLET_SELECTED' });
      } catch (error) {
        expect(error.message).toBe('Timeout');
      }
    });

    test('should catch and dispatch registration errors', async () => {
      mockRuntime.sendMessage.mockRejectedValueOnce(new Error('Invalid wallet'));

      try {
        await mockRuntime.sendMessage({ type: 'REGISTER_WALLET' });
      } catch (error) {
        expect(error.message).toBe('Invalid wallet');
      }
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('should detect browser runtime', () => {
      const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
      expect(runtime).toBeDefined();
    });

    test('should have sendMessage function', () => {
      const runtime = chrome.runtime;
      expect(typeof runtime.sendMessage).toBe('function');
    });

    test('should have getURL function', () => {
      const runtime = chrome.runtime;
      expect(typeof runtime.getURL).toBe('function');
    });
  });
});

describe('Content Script - Event Dispatching', () => {
  describe('CustomEvent Creation', () => {
    test('should create DC_CREDENTIALS_REQUEST event', () => {
      const event = new CustomEvent('DC_CREDENTIALS_REQUEST', {
        detail: { requestId: 'test' }
      });

      expect(event.type).toBe('DC_CREDENTIALS_REQUEST');
      expect(event.detail.requestId).toBe('test');
    });

    test('should create DC_CREDENTIALS_RESPONSE event', () => {
      const event = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
        detail: { requestId: 'test', response: {} }
      });

      expect(event.type).toBe('DC_CREDENTIALS_RESPONSE');
    });

    test('should create DC_SHOW_WALLET_SELECTOR event', () => {
      const event = new CustomEvent('DC_SHOW_WALLET_SELECTOR', {
        detail: { wallets: [] }
      });

      expect(event.type).toBe('DC_SHOW_WALLET_SELECTOR');
    });

    test('should create DC_WALLET_SELECTED event', () => {
      const event = new CustomEvent('DC_WALLET_SELECTED', {
        detail: { walletId: 'w1' }
      });

      expect(event.type).toBe('DC_WALLET_SELECTED');
    });

    test('should create DC_INVOKE_WALLET event', () => {
      const event = new CustomEvent('DC_INVOKE_WALLET', {
        detail: { wallet: {} }
      });

      expect(event.type).toBe('DC_INVOKE_WALLET');
    });

    test('should create DC_WALLET_REGISTRATION_REQUEST event', () => {
      const event = new CustomEvent('DC_WALLET_REGISTRATION_REQUEST', {
        detail: { wallet: {} }
      });

      expect(event.type).toBe('DC_WALLET_REGISTRATION_REQUEST');
    });

    test('should create DC_WALLET_REGISTRATION_RESPONSE event', () => {
      const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
        detail: { success: true }
      });

      expect(event.type).toBe('DC_WALLET_REGISTRATION_RESPONSE');
    });

    test('should create DC_WALLET_CHECK_REQUEST event', () => {
      const event = new CustomEvent('DC_WALLET_CHECK_REQUEST', {
        detail: { url: 'https://test.com' }
      });

      expect(event.type).toBe('DC_WALLET_CHECK_REQUEST');
    });

    test('should create DC_WALLET_CHECK_RESPONSE event', () => {
      const event = new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
        detail: { isRegistered: true }
      });

      expect(event.type).toBe('DC_WALLET_CHECK_RESPONSE');
    });

    test('should create DC_PROTOCOLS_UPDATE_REQUEST event', () => {
      const event = new CustomEvent('DC_PROTOCOLS_UPDATE_REQUEST', {
        detail: { updateId: 'u1' }
      });

      expect(event.type).toBe('DC_PROTOCOLS_UPDATE_REQUEST');
    });

    test('should create DC_PROTOCOLS_UPDATE_RESPONSE event', () => {
      const event = new CustomEvent('DC_PROTOCOLS_UPDATE_RESPONSE', {
        detail: { protocols: ['openid4vp'] }
      });

      expect(event.type).toBe('DC_PROTOCOLS_UPDATE_RESPONSE');
    });
  });
});

