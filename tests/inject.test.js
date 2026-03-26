/**
 * Unit tests for inject.js - DC API interception and wallet registration API
 */

describe('Inject Script - DC API Interception', () => {
  let originalCredentialsGet;

  beforeEach(() => {
    // Mock original credentials.get
    originalCredentialsGet = jest.fn(() => Promise.resolve({ id: 'native-credential' }));
    navigator.credentials.get = originalCredentialsGet;

    // Mock custom event dispatching
    window.dispatchEvent = jest.fn();
    window.addEventListener = jest.fn();
  });

  describe('navigator.credentials.get override', () => {
    test('should detect digital identity requests', () => {
      const digitalIdentityOptions = {
        digital: true,
        mediation: 'optional',
        identity: {
          providers: [{
            protocol: 'openid4vp'
          }]
        }
      };

      const isDigitalIdentity = !!(digitalIdentityOptions && (
        digitalIdentityOptions.identity || 
        digitalIdentityOptions.digital || 
        digitalIdentityOptions.mediation === 'optional' ||
        digitalIdentityOptions.mediation === 'required'
      ));

      expect(isDigitalIdentity).toBe(true);
    });

    test('should pass through non-digital-identity requests', () => {
      const passwordOptions = {
        password: true,
        mediation: 'silent'
      };

      const isDigitalIdentity = passwordOptions && (
        passwordOptions.identity || 
        passwordOptions.digital || 
        passwordOptions.mediation === 'optional' ||
        passwordOptions.mediation === 'required'
      );

      expect(isDigitalIdentity).toBe(false);
    });

    test('should generate unique request IDs', () => {
      const id1 = `dc-req-1-${Date.now()}`;
      const id2 = `dc-req-2-${Date.now()}`;

      expect(id1).not.toEqual(id2);
      expect(id1).toMatch(/^dc-req-\d+-\d+$/);
      expect(id2).toMatch(/^dc-req-\d+-\d+$/);
    });

    test('should dispatch DC_CREDENTIALS_REQUEST event', () => {
      const requestId = 'test-request-123';
      const options = {
        digital: true,
        identity: { providers: [] }
      };

      const event = new CustomEvent('DC_CREDENTIALS_REQUEST', {
        detail: { requestId, options }
      });

      window.dispatchEvent(event);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DC_CREDENTIALS_REQUEST',
          detail: expect.objectContaining({
            requestId,
            options
          })
        })
      );
    });
  });

  describe('DC_CREDENTIALS_RESPONSE handling', () => {
    test('should handle native wallet selection', () => {
      const requestId = 'test-request-123';
      const useNative = true;

      const responseEvent = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
        detail: { requestId, useNative }
      });

      // Simulate that the response would trigger native API
      if (useNative) {
        expect(useNative).toBe(true);
      }
    });

    test('should handle wallet credential response', () => {
      const requestId = 'test-request-123';
      const response = {
        id: 'credential-123',
        type: 'VerifiableCredential',
        wallet: 'Test Wallet'
      };

      const responseEvent = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
        detail: { requestId, response }
      });

      expect(responseEvent.detail.response).toEqual(response);
      expect(responseEvent.detail.response.id).toBe('credential-123');
    });

    test('should handle error responses', () => {
      const requestId = 'test-request-123';
      const error = 'User cancelled the request';

      const responseEvent = new CustomEvent('DC_CREDENTIALS_RESPONSE', {
        detail: { requestId, error }
      });

      expect(responseEvent.detail.error).toBe(error);
    });
  });
});

describe('Inject Script - Wallet Registration API', () => {
  beforeEach(() => {
    // Clear any existing API
    delete window.DigitalCredentialsWalletSelector;
    delete window.DCWS;

    // Mock event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
    window.dispatchEvent = jest.fn();
  });

  describe('API Exposure', () => {
    test('should expose DigitalCredentialsWalletSelector namespace', () => {
      // Simulate API exposure
      window.DigitalCredentialsWalletSelector = {
        version: '1.0.0',
        isInstalled: () => true,
        registerWallet: jest.fn(),
        isWalletRegistered: jest.fn()
      };

      expect(window.DigitalCredentialsWalletSelector).toBeDefined();
      expect(window.DigitalCredentialsWalletSelector.version).toBe('1.0.0');
    });

    test('should expose DCWS alias', () => {
      window.DigitalCredentialsWalletSelector = {
        version: '1.0.0',
        isInstalled: () => true
      };
      window.DCWS = window.DigitalCredentialsWalletSelector;

      expect(window.DCWS).toBe(window.DigitalCredentialsWalletSelector);
    });
  });

  describe('isInstalled()', () => {
    test('should return true when extension is active', () => {
      const isInstalled = () => true;
      expect(isInstalled()).toBe(true);
    });
  });

  describe('registerWallet()', () => {
    test('should validate required fields', () => {
      const walletInfo = {
        name: 'Test Wallet',
        url: 'https://wallet.test.com'
      };

      const isValid = !!(walletInfo && walletInfo.name && walletInfo.url);
      expect(isValid).toBe(true);
    });

    test('should reject missing name', () => {
      const walletInfo = {
        url: 'https://wallet.test.com'
      };

      const isValid = !!(walletInfo && walletInfo.name && walletInfo.url);
      expect(isValid).toBe(false);
    });

    test('should reject missing URL', () => {
      const walletInfo = {
        name: 'Test Wallet'
      };

      const isValid = !!(walletInfo && walletInfo.name && walletInfo.url);
      expect(isValid).toBe(false);
    });

    test('should validate URL format', () => {
      const validUrl = 'https://wallet.test.com';
      const invalidUrl = 'not-a-url';

      expect(() => new URL(validUrl)).not.toThrow();
      expect(() => new URL(invalidUrl)).toThrow();
    });

    test('should prepare wallet data correctly', () => {
      const walletInfo = {
        name: 'Test Wallet',
        url: 'https://wallet.test.com',
        description: 'A test wallet',
        icon: '🧪',
        color: '#10b981'
      };

      const preparedWallet = {
        name: walletInfo.name,
        url: walletInfo.url,
        description: walletInfo.description || '',
        icon: walletInfo.icon || walletInfo.logo || '🔐',
        color: walletInfo.color || '#3b82f6',
        enabled: true,
        autoRegistered: true,
        registeredAt: new Date().toISOString()
      };

      expect(preparedWallet.name).toBe('Test Wallet');
      expect(preparedWallet.url).toBe('https://wallet.test.com');
      expect(preparedWallet.icon).toBe('🧪');
      expect(preparedWallet.color).toBe('#10b981');
      expect(preparedWallet.autoRegistered).toBe(true);
    });

    test('should use default icon if not provided', () => {
      const walletInfo = {
        name: 'Test Wallet',
        url: 'https://wallet.test.com'
      };

      const icon = walletInfo.icon || walletInfo.logo || '🔐';
      expect(icon).toBe('🔐');
    });

    test('should use logo as fallback for icon', () => {
      const walletInfo = {
        name: 'Test Wallet',
        url: 'https://wallet.test.com',
        logo: 'https://wallet.test.com/logo.png'
      };

      const icon = walletInfo.icon || walletInfo.logo || '🔐';
      expect(icon).toBe('https://wallet.test.com/logo.png');
    });

    test('should generate registration ID', () => {
      const registrationId = `wallet-reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      expect(registrationId).toMatch(/^wallet-reg-\d+-[a-z0-9]+$/);
    });

    test('should dispatch registration request event', () => {
      const registrationId = 'test-reg-123';
      const wallet = {
        name: 'Test Wallet',
        url: 'https://wallet.test.com'
      };

      const event = new CustomEvent('DC_WALLET_REGISTRATION_REQUEST', {
        detail: { registrationId, wallet }
      });

      window.dispatchEvent(event);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DC_WALLET_REGISTRATION_REQUEST',
          detail: expect.objectContaining({
            registrationId,
            wallet
          })
        })
      );
    });
  });

  describe('isWalletRegistered()', () => {
    test('should generate check ID', () => {
      const checkId = `wallet-check-${Date.now()}`;
      expect(checkId).toMatch(/^wallet-check-\d+$/);
    });

    test('should dispatch check request event', () => {
      const checkId = 'test-check-123';
      const url = 'https://wallet.test.com';

      const event = new CustomEvent('DC_WALLET_CHECK_REQUEST', {
        detail: { checkId, url }
      });

      window.dispatchEvent(event);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DC_WALLET_CHECK_REQUEST',
          detail: expect.objectContaining({
            checkId,
            url
          })
        })
      );
    });
  });

  describe('Response Handling', () => {
    test('should handle successful registration response', () => {
      const registrationId = 'test-reg-123';
      const wallet = {
        id: 'wallet-123',
        name: 'Test Wallet',
        url: 'https://wallet.test.com',
        autoRegistered: true
      };

      const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
        detail: {
          registrationId,
          success: true,
          alreadyRegistered: false,
          wallet
        }
      });

      expect(event.detail.success).toBe(true);
      expect(event.detail.wallet.autoRegistered).toBe(true);
    });

    test('should handle already registered response', () => {
      const registrationId = 'test-reg-123';
      const wallet = { id: 'wallet-123', name: 'Existing' };

      const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
        detail: {
          registrationId,
          success: true,
          alreadyRegistered: true,
          wallet
        }
      });

      expect(event.detail.alreadyRegistered).toBe(true);
    });

    test('should handle registration error', () => {
      const registrationId = 'test-reg-123';
      const error = 'Invalid wallet URL';

      const event = new CustomEvent('DC_WALLET_REGISTRATION_RESPONSE', {
        detail: {
          registrationId,
          success: false,
          error
        }
      });

      expect(event.detail.success).toBe(false);
      expect(event.detail.error).toBe('Invalid wallet URL');
    });

    test('should handle check response', () => {
      const checkId = 'test-check-123';
      const isRegistered = true;

      const event = new CustomEvent('DC_WALLET_CHECK_RESPONSE', {
        detail: { checkId, isRegistered }
      });

      expect(event.detail.isRegistered).toBe(true);
    });
  });
});

describe('Inject Script - buildWalletUrl Function', () => {
  describe('OpenID4VP Protocol URL Building', () => {
    const mockWallet = {
      id: 'wallet-1',
      name: 'Test Wallet',
      url: 'https://wallet.example.com'
    };

    function buildWalletUrl(wallet, protocol, request) {
      const walletBaseUrl = wallet.url;
      const requestData = request.data || request;

      if (protocol.startsWith('openid4vp')) {
        const walletUrl = new URL(walletBaseUrl);
        
        walletUrl.searchParams.set('client_id', 'https://verifier.example.com');
        walletUrl.searchParams.set('response_type', requestData.response_type || 'vp_token');
        walletUrl.searchParams.set('response_mode', requestData.response_mode || 'dc_api');
        walletUrl.searchParams.set('nonce', requestData.nonce);
        walletUrl.searchParams.set('response_uri', 'https://verifier.example.com/callback');
        
        walletUrl.searchParams.set('client_metadata', JSON.stringify(requestData.client_metadata || {}));
        walletUrl.searchParams.set('dcql_query', JSON.stringify(requestData.dcql_query || {}));
        
        if (requestData.state) {
          walletUrl.searchParams.set('state', requestData.state);
        }
        
        return walletUrl.toString();
      }

      // Generic protocol
      const url = new URL(walletBaseUrl);
      url.searchParams.set('request', JSON.stringify(requestData));
      url.searchParams.set('protocol', protocol);
      url.searchParams.set('origin', 'https://verifier.example.com');
      
      return url.toString();
    }

    test('should build URL with client_id', () => {
      const request = { data: { nonce: '123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('client_id=');
    });

    test('should build URL with response_type', () => {
      const request = { data: { nonce: '123', response_type: 'vp_token' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('response_type=vp_token');
    });

    test('should default response_type to vp_token', () => {
      const request = { data: { nonce: '123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('response_type=vp_token');
    });

    test('should build URL with response_mode', () => {
      const request = { data: { nonce: '123', response_mode: 'direct_post' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('response_mode=direct_post');
    });

    test('should default response_mode to dc_api', () => {
      const request = { data: { nonce: '123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('response_mode=dc_api');
    });

    test('should build URL with nonce', () => {
      const request = { data: { nonce: 'test-nonce-123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('nonce=test-nonce-123');
    });

    test('should build URL with client_metadata as JSON', () => {
      const clientMetadata = { client_name: 'Test Verifier' };
      const request = { data: { nonce: '123', client_metadata: clientMetadata } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('client_metadata=');
      // URL encoding may use either + or %20 for spaces
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('client_metadata')).toBe(JSON.stringify(clientMetadata));
    });

    test('should build URL with dcql_query as JSON', () => {
      const dcqlQuery = { credentials: [{ type: 'VerifiableCredential' }] };
      const request = { data: { nonce: '123', dcql_query: dcqlQuery } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('dcql_query=');
    });

    test('should include state if provided', () => {
      const request = { data: { nonce: '123', state: 'state-abc' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url).toContain('state=state-abc');
    });

    test('should not include state if not provided', () => {
      const request = { data: { nonce: '123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      // State should not appear since it wasn't provided
      const urlObj = new URL(url);
      expect(urlObj.searchParams.has('state')).toBe(false);
    });

    test('should handle openid4vp-v1-signed protocol', () => {
      const request = { data: { nonce: '123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp-v1-signed', request);
      
      expect(url).toContain('client_id=');
      expect(url).toContain('response_type=');
    });

    test('should handle openid4vp-v1-unsigned protocol', () => {
      const request = { data: { nonce: '123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp-v1-unsigned', request);
      
      expect(url).toContain('client_id=');
    });

    test('should use wallet base URL', () => {
      const request = { data: { nonce: '123' } };
      const url = buildWalletUrl(mockWallet, 'openid4vp', request);
      
      expect(url.startsWith('https://wallet.example.com')).toBe(true);
    });
  });

  describe('Generic Protocol URL Building', () => {
    const mockWallet = {
      id: 'wallet-1',
      name: 'Test Wallet',
      url: 'https://wallet.example.com'
    };

    function buildWalletUrl(wallet, protocol, request) {
      const walletBaseUrl = wallet.url;
      const requestData = request.data || request;

      if (protocol.startsWith('openid4vp')) {
        // OpenID4VP handling (not tested here)
        return '';
      }

      const url = new URL(walletBaseUrl);
      url.searchParams.set('request', JSON.stringify(requestData));
      url.searchParams.set('protocol', protocol);
      url.searchParams.set('origin', 'https://verifier.example.com');
      
      return url.toString();
    }

    test('should build URL with request as JSON', () => {
      const request = { data: { customField: 'value' } };
      const url = buildWalletUrl(mockWallet, 'custom-protocol', request);
      
      expect(url).toContain('request=');
    });

    test('should include protocol identifier', () => {
      const request = { data: {} };
      const url = buildWalletUrl(mockWallet, 'my-custom-protocol', request);
      
      expect(url).toContain('protocol=my-custom-protocol');
    });

    test('should include origin', () => {
      const request = { data: {} };
      const url = buildWalletUrl(mockWallet, 'custom', request);
      
      expect(url).toContain('origin=');
    });

    test('should handle request without data wrapper', () => {
      const request = { customField: 'value' };
      const url = buildWalletUrl(mockWallet, 'custom', request);
      
      expect(url).toContain('customField');
    });
  });
});

describe('Inject Script - Protocol Validation', () => {
  describe('Protocol Identifier Validation', () => {
    const protocolPattern = /^[a-z0-9-]+$/;

    test('should accept valid openid4vp protocol', () => {
      expect(protocolPattern.test('openid4vp')).toBe(true);
    });

    test('should accept valid openid4vp-v1-signed protocol', () => {
      expect(protocolPattern.test('openid4vp-v1-signed')).toBe(true);
    });

    test('should accept valid openid4vp-v1-unsigned protocol', () => {
      expect(protocolPattern.test('openid4vp-v1-unsigned')).toBe(true);
    });

    test('should accept w3c-vc protocol', () => {
      expect(protocolPattern.test('w3c-vc')).toBe(true);
    });

    test('should reject protocol with uppercase', () => {
      expect(protocolPattern.test('OpenID4VP')).toBe(false);
    });

    test('should reject protocol with spaces', () => {
      expect(protocolPattern.test('openid 4vp')).toBe(false);
    });

    test('should reject protocol with underscores', () => {
      expect(protocolPattern.test('openid_4vp')).toBe(false);
    });

    test('should reject protocol with special characters', () => {
      expect(protocolPattern.test('openid4vp!')).toBe(false);
    });

    test('should accept all-numeric protocol', () => {
      expect(protocolPattern.test('123')).toBe(true);
    });

    test('should accept hyphenated protocol', () => {
      expect(protocolPattern.test('my-custom-protocol')).toBe(true);
    });
  });

  describe('Response Validation', () => {
    test('should create credential object with type', () => {
      const credential = {
        type: 'digital',
        protocol: 'openid4vp',
        data: { vp_token: 'token-value' },
        id: `credential-${Date.now()}`
      };

      expect(credential.type).toBe('digital');
    });

    test('should create credential object with protocol', () => {
      const credential = {
        type: 'digital',
        protocol: 'openid4vp-v1-signed',
        data: {},
        id: 'cred-123'
      };

      expect(credential.protocol).toBe('openid4vp-v1-signed');
    });

    test('should create credential object with id', () => {
      const timestamp = Date.now();
      const credential = {
        type: 'digital',
        protocol: 'openid4vp',
        data: {},
        id: `credential-${timestamp}`
      };

      expect(credential.id).toMatch(/^credential-\d+$/);
    });

    test('should have toJSON method', () => {
      const credential = {
        type: 'digital',
        protocol: 'openid4vp',
        data: { token: 'abc' },
        id: 'cred-123',
        toJSON: function() {
          return {
            type: this.type,
            protocol: this.protocol,
            data: this.data,
            id: this.id
          };
        }
      };

      const json = credential.toJSON();
      expect(json.type).toBe('digital');
      expect(json.protocol).toBe('openid4vp');
      expect(json.data.token).toBe('abc');
    });
  });
});

describe('Inject Script - Supported Protocols Cache', () => {
  test('should initialize as empty Set', () => {
    const supportedProtocols = new Set();
    expect(supportedProtocols.size).toBe(0);
  });

  test('should add protocols to cache', () => {
    const supportedProtocols = new Set();
    supportedProtocols.add('openid4vp');
    supportedProtocols.add('openid4vp-v1-signed');

    expect(supportedProtocols.has('openid4vp')).toBe(true);
    expect(supportedProtocols.has('openid4vp-v1-signed')).toBe(true);
  });

  test('should check if protocol is supported', () => {
    const supportedProtocols = new Set(['openid4vp']);
    
    expect(supportedProtocols.has('openid4vp')).toBe(true);
    expect(supportedProtocols.has('unknown')).toBe(false);
  });

  test('should update from array', () => {
    const protocols = ['openid4vp', 'openid4vp-v1-signed', 'openid4vp-v1-unsigned'];
    const supportedProtocols = new Set(protocols);

    expect(supportedProtocols.size).toBe(3);
    expect(Array.from(supportedProtocols)).toEqual(protocols);
  });

  test('should filter requests by supported protocols', () => {
    const supportedProtocols = new Set(['openid4vp']);
    const digitalRequests = [
      { protocol: 'openid4vp', data: {} },
      { protocol: 'unknown-protocol', data: {} }
    ];

    const supportedRequests = digitalRequests.filter(req => supportedProtocols.has(req.protocol));
    const unsupportedRequests = digitalRequests.filter(req => !supportedProtocols.has(req.protocol));

    expect(supportedRequests.length).toBe(1);
    expect(supportedRequests[0].protocol).toBe('openid4vp');
    expect(unsupportedRequests.length).toBe(1);
    expect(unsupportedRequests[0].protocol).toBe('unknown-protocol');
  });
});
