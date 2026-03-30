/**
 * Injected script that runs in the page context
 * Intercepts navigator.credentials.get() calls for the Digital Credentials API
 */

(function() {
  'use strict';

  console.log('Web Wallet Selector injected');

  // Store the original navigator.credentials.get
  const originalCredentialsGet = navigator.credentials.get.bind(navigator.credentials);

  // Store original DigitalCredential.userAgentAllowsProtocol if it exists
  const originalUserAgentAllowsProtocol = typeof DigitalCredential !== 'undefined' && DigitalCredential.userAgentAllowsProtocol
    ? DigitalCredential.userAgentAllowsProtocol.bind(DigitalCredential)
    : null;

  // Counter for request IDs
  let requestIdCounter = 0;

  // Store pending requests
  const pendingRequests = new Map();

  // Cache of supported protocols (updated when wallets register)
  let supportedProtocols = new Set();

    // Initialize protocol plugin registry
  const protocolRegistry = typeof window.ProtocolPluginRegistry !== 'undefined'
    ? new window.ProtocolPluginRegistry()
    : null;

  // Register any pending protocol plugins that were loaded before inject.js
  if (protocolRegistry && window._pendingProtocolPlugins) {
    console.log('Registering pending protocol plugins:', window._pendingProtocolPlugins.length);
    window._pendingProtocolPlugins.forEach(plugin => {
      try {
        protocolRegistry.register(plugin);
      } catch (err) {
        console.error('Failed to register pending protocol plugin:', err);
      }
    });
    // Clear the pending list
    window._pendingProtocolPlugins = [];
  }

  // Store wallet-provided callbacks
  const walletCallbacks = {
    jwtVerifiers: new Map(), // Maps wallet URL -> JWT verification function
  };

  /**
   * Override DigitalCredential.userAgentAllowsProtocol
   * This allows the extension to report protocols supported by web wallets
   */
  if (typeof DigitalCredential !== 'undefined') {
    DigitalCredential.userAgentAllowsProtocol = function(protocol) {
      // Check if any registered web wallet supports this protocol
      if (supportedProtocols.has(protocol)) {
        return true;
      }

      // Fall back to native implementation if available
      if (originalUserAgentAllowsProtocol) {
        return originalUserAgentAllowsProtocol(protocol);
      }

      return false;
    };
    console.log('DigitalCredential.userAgentAllowsProtocol overridden');
  }

  /**
   * Update supported protocols cache from extension
   */
  async function updateSupportedProtocols() {
    return new Promise((resolve) => {
      const updateId = `protocols-update-${Date.now()}`;

      const responseHandler = function(event) {
        if (event.detail.updateId === updateId) {
          window.removeEventListener('DC_PROTOCOLS_UPDATE_RESPONSE', responseHandler);
          if (event.detail.protocols) {
            supportedProtocols = new Set(event.detail.protocols);
            console.log('Updated supported protocols:', Array.from(supportedProtocols));
          }
          resolve();
        }
      };

      window.addEventListener('DC_PROTOCOLS_UPDATE_RESPONSE', responseHandler);

      window.dispatchEvent(new CustomEvent('DC_PROTOCOLS_UPDATE_REQUEST', {
        detail: { updateId: updateId }
      }));

      setTimeout(() => {
        window.removeEventListener('DC_PROTOCOLS_UPDATE_RESPONSE', responseHandler);
        resolve();
      }, 1000);
    });
  }

  // Update protocols on load
  updateSupportedProtocols();

  /**
   * Override navigator.credentials.get
   */
  navigator.credentials.get = async function(options) {
    console.log('navigator.credentials.get intercepted:', options);

    // Check if this is a digital identity request
    const isDigitalIdentityRequest = options && (
      options.identity ||
      options.digital ||
      options.mediation === 'optional' ||
      options.mediation === 'required'
    );

    if (!isDigitalIdentityRequest) {
      // If not a digital identity request, pass through to native implementation
      console.log('Not a digital identity request, passing to native API');
      return originalCredentialsGet(options);
    }

    // Extract digital credential requests
    const digitalRequests = options.digital?.requests || [];

    if (digitalRequests.length === 0) {
      // No digital requests, pass through
      console.log('No digital credential requests, passing to native API');
      return originalCredentialsGet(options);
    }

    // Filter requests by supported protocols
    const supportedRequests = digitalRequests.filter(req => supportedProtocols.has(req.protocol));
    const unsupportedRequests = digitalRequests.filter(req => !supportedProtocols.has(req.protocol));

    // If no requests match our supported protocols, pass through to native
    if (supportedRequests.length === 0) {
      console.log('No requests match supported protocols, passing to native API');
      return originalCredentialsGet(options);
    }

    // If we have mixed requests, we'll handle the supported ones and log the unsupported
    if (unsupportedRequests.length > 0) {
      console.log('Unsupported protocols will be handled by native API:',
        unsupportedRequests.map(r => r.protocol));
    }

    // Generate unique request ID
    const requestId = `dc-req-${++requestIdCounter}-${Date.now()}`;

    // Process requests through protocol plugins
    const processedRequests = [];
    for (const request of supportedRequests) {
      try {
        const preparedData = protocolRegistry.prepareRequest(request.protocol, request.data);
        processedRequests.push({
          protocol: request.protocol,
          data: preparedData,
          originalData: request.data
        });
      } catch (error) {
        console.error(`Error preparing request for protocol ${request.protocol}:`, error);
        // Skip this request if we can't prepare it
      }
    }

    if (processedRequests.length === 0) {
      console.log('No requests could be processed, passing to native API');
      return originalCredentialsGet(options);
    }

    // Create a promise that will be resolved when we get the response
    const credentialPromise = new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject, options, processedRequests });

      // Set a timeout for the request (30 seconds)
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          reject(new DOMException('Request timeout', 'AbortError'));
        }
      }, 30000);
    });

    // Dispatch custom event to content script
    window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_REQUEST', {
      detail: {
        requestId: requestId,
        requests: processedRequests,
        options: options
      }
    }));

    return credentialPromise;
  };

  /**
   * Listen for responses from the content script
   */
  window.addEventListener('DC_CREDENTIALS_RESPONSE', function(event) {
    const { requestId, response, error, useNative, protocol } = event.detail;

    const pending = pendingRequests.get(requestId);
    if (!pending) {
      console.warn('Received response for unknown request:', requestId);
      return;
    }

    pendingRequests.delete(requestId);

    if (useNative) {
      // User chose to use native browser implementation
      console.log('Using native Digital Credentials API');
      originalCredentialsGet(pending.options)
        .then(credential => pending.resolve(credential))
        .catch(err => pending.reject(err));
    } else if (error) {
      // An error occurred
      pending.reject(new DOMException(error, 'AbortError'));
    } else if (response) {
      // Validate the response using the protocol plugin
      try {
        if (protocol && protocolRegistry.isSupported(protocol)) {
          const validatedResponse = protocolRegistry.validateResponse(protocol, response);

          // Create a DigitalCredential-like object
          const credential = {
            type: 'digital',
            protocol: protocol,
            data: validatedResponse,
            id: `credential-${Date.now()}`,
            // Add toJSON method for serialization
            toJSON: function() {
              return {
                type: this.type,
                protocol: this.protocol,
                data: this.data,
                id: this.id
              };
            }
          };

          pending.resolve(credential);
        } else {
          // No protocol specified or unknown protocol, return as-is
          pending.resolve(response);
        }
      } catch (validationError) {
        console.error('Response validation failed:', validationError);
        pending.reject(new DOMException('Invalid credential response: ' + validationError.message, 'AbortError'));
      }
    } else {
      // User cancelled
      pending.reject(new DOMException('User cancelled the request', 'AbortError'));
    }
  });

  /**
   * Listen for wallet invocation requests
   */
  window.addEventListener('DC_INVOKE_WALLET', function(event) {
    const { requestId, wallet, protocol, request } = event.detail;

    console.log('Invoking wallet:', wallet.name, 'for protocol:', protocol);

    try {
      // Build wallet URL with the authorization request
      const walletUrl = buildWalletUrl(wallet, protocol, request);

      console.log('Opening wallet URL:', walletUrl);

      // Store the request context for when the wallet responds
      const responseChannel = `dc-response-${requestId}`;

      // Listen for response via postMessage or redirect
      const messageHandler = function(messageEvent) {
        // Verify origin matches wallet domain
        const walletOrigin = new URL(wallet.url).origin;
        if (messageEvent.origin !== walletOrigin) {
          return;
        }

        // Check if this is a DC API response
        if (messageEvent.data && messageEvent.data.type === 'DC_WALLET_RESPONSE' && messageEvent.data.requestId === requestId) {
          console.log('Received wallet response via postMessage:', messageEvent.data);

          window.removeEventListener('message', messageHandler);

          // Dispatch the response
          window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_RESPONSE', {
            detail: {
              requestId: requestId,
              response: messageEvent.data.response,
              protocol: protocol
            }
          }));
        }
      };

      window.addEventListener('message', messageHandler);

      // Set a timeout for the wallet response
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);

        // Check if request is still pending
        const pending = pendingRequests.get(requestId);
        if (pending) {
          console.warn('Wallet response timeout for request:', requestId);
          window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_RESPONSE', {
            detail: {
              requestId: requestId,
              error: 'Wallet response timeout'
            }
          }));
        }
      }, 300000); // 5 minute timeout

      // Open the wallet in a new tab (not popup)
      const walletWindow = window.open(walletUrl, '_blank');

      if (!walletWindow) {
        console.error('Failed to open wallet window - popup may be blocked');
        throw new Error('Failed to open wallet window - popup blocked by browser');
      }

    } catch (error) {
      console.error('Error invoking wallet:', error);
      window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_RESPONSE', {
        detail: {
          requestId: requestId,
          error: error.message
        }
      }));
    }
  });

  /**
   * Build wallet URL with authorization request parameters
   */
  function buildWalletUrl(wallet, protocol, request) {
    const walletBaseUrl = wallet.url;

    // Extract the actual request data (request might have .data property from prepareRequest)
    const requestData = request.data || request;

    // For OpenID4VP protocols, construct the authorization request
    if (protocol.startsWith('openid4vp')) {
      // wwWallet's UriHandlerProvider checks window.location.search for query parameters
      // It looks for client_id and request_uri (or direct parameters) in the URL query string
      // So we pass all OpenID4VP parameters directly as query params to the wallet URL
      const walletUrl = new URL(walletBaseUrl);

      // Set all OpenID4VP parameters as query params per parseAuthorizationParams()
      walletUrl.searchParams.set('client_id', window.location.origin);
      walletUrl.searchParams.set('response_type', requestData.response_type || 'vp_token');
      walletUrl.searchParams.set('response_mode', requestData.response_mode || 'dc_api');
      walletUrl.searchParams.set('nonce', requestData.nonce);
      walletUrl.searchParams.set('response_uri', window.location.href);

      // Complex parameters need to be JSON-stringified per OpenID4VP spec
      walletUrl.searchParams.set('client_metadata', JSON.stringify(requestData.client_metadata || {}));
      walletUrl.searchParams.set('dcql_query', JSON.stringify(requestData.dcql_query || {}));

      // Add state if provided
      if (requestData.state) {
        walletUrl.searchParams.set('state', requestData.state);
      }

      console.log('Built wallet URL with query params:', walletUrl.toString().substring(0, 200) + '...');

      return walletUrl.toString();
    }

    // For other protocols, use a generic approach
    const url = new URL(walletBaseUrl);
    url.searchParams.set('request', JSON.stringify(requestData));
    url.searchParams.set('protocol', protocol);
    url.searchParams.set('origin', window.location.origin);

    return url.toString();
  }

  console.log('Digital Credentials API interception active');

  /**
   * Wallet Auto-Registration API
   * Allows wallets to detect the extension and register themselves
   */

  // Expose a namespace for the extension API
  window.DigitalCredentialsWalletSelector = {
    version: '1.0.0',

    /**
     * Check if the extension is installed
     * @returns {boolean} True if extension is installed
     */
    isInstalled: function() {
      return true;
    },

    /**
     * Register a wallet with the extension
     * @param {Object} walletInfo - Wallet information
     * @param {string} walletInfo.name - Display name of the wallet
     * @param {string} walletInfo.url - Wallet endpoint URL
     * @param {string[]} walletInfo.protocols - Supported protocol identifiers
     * @param {string} [walletInfo.description] - Optional description
     * @param {string} [walletInfo.icon] - Optional icon (emoji or URL)
     * @param {string} [walletInfo.logo] - Optional logo URL
     * @param {string} [walletInfo.color] - Optional brand color
     * @returns {Promise<Object>} Result of registration
     */
    registerWallet: async function(walletInfo) {
      if (!walletInfo || !walletInfo.name || !walletInfo.url) {
        throw new Error('Wallet registration requires at least name and url');
      }

      if (!walletInfo.protocols || !Array.isArray(walletInfo.protocols) || walletInfo.protocols.length === 0) {
        throw new Error('Wallet registration requires at least one supported protocol');
      }

      // Validate URL
      try {
        new URL(walletInfo.url);
      } catch (e) {
        throw new Error('Invalid wallet URL: ' + walletInfo.url);
      }

      // Validate protocol identifiers (must be ASCII lower alpha, digits, and hyphens)
      const protocolPattern = /^[a-z0-9-]+$/;
      for (const protocol of walletInfo.protocols) {
        if (!protocolPattern.test(protocol)) {
          throw new Error('Invalid protocol identifier: ' + protocol + ' (must contain only lowercase letters, digits, and hyphens)');
        }
      }

      // Prepare wallet data
      const wallet = {
        name: walletInfo.name,
        url: walletInfo.url,
        protocols: walletInfo.protocols,
        description: walletInfo.description || '',
        icon: walletInfo.icon || walletInfo.logo || '🔐',
        color: walletInfo.color || '#1C4587',
        enabled: true,
        autoRegistered: true,
        registeredAt: new Date().toISOString()
      };

      // Send registration request to extension
      return new Promise((resolve, reject) => {
        const registrationId = `wallet-reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Listen for response
        const responseHandler = function(event) {
          if (event.detail.registrationId === registrationId) {
            window.removeEventListener('DC_WALLET_REGISTRATION_RESPONSE', responseHandler);

            if (event.detail.success) {
              resolve({
                success: true,
                alreadyRegistered: event.detail.alreadyRegistered,
                wallet: event.detail.wallet
              });
            } else {
              reject(new Error(event.detail.error || 'Registration failed'));
            }
          }
        };

        window.addEventListener('DC_WALLET_REGISTRATION_RESPONSE', responseHandler);

        // Dispatch registration request
        window.dispatchEvent(new CustomEvent('DC_WALLET_REGISTRATION_REQUEST', {
          detail: {
            registrationId: registrationId,
            wallet: wallet
          }
        }));

        // Timeout after 5 seconds
        setTimeout(() => {
          window.removeEventListener('DC_WALLET_REGISTRATION_RESPONSE', responseHandler);
          reject(new Error('Registration timeout'));
        }, 5000);
      });
    },

    /**
     * Check if a wallet is already registered
     * @param {string} url - Wallet URL to check
     * @returns {Promise<boolean>} True if wallet is registered
     */
    isWalletRegistered: async function(url) {
      return new Promise((resolve, reject) => {
        const checkId = `wallet-check-${Date.now()}`;

        const responseHandler = function(event) {
          if (event.detail.checkId === checkId) {
            window.removeEventListener('DC_WALLET_CHECK_RESPONSE', responseHandler);
            resolve(event.detail.isRegistered);
          }
        };

        window.addEventListener('DC_WALLET_CHECK_RESPONSE', responseHandler);

        window.dispatchEvent(new CustomEvent('DC_WALLET_CHECK_REQUEST', {
          detail: {
            checkId: checkId,
            url: url
          }
        }));

        setTimeout(() => {
          window.removeEventListener('DC_WALLET_CHECK_RESPONSE', responseHandler);
          reject(new Error('Check timeout'));
        }, 5000);
      });
    },

    /**
     * Register a JWT verification callback for protocol operations
     * Allows wallets to provide their own JWT verification logic
     * @param {string} walletUrl - The URL of the wallet providing the verifier
     * @param {Function} verifyCallback - Async function that verifies JWT
     *   Signature: async (jwt, options) => { valid: boolean, payload?: any, error?: string }
     *   - jwt: string - The JWT to verify
     *   - options: { publicKey?: string, certificate?: string, algorithm?: string }
     * @returns {boolean} Success status
     */
    registerJWTVerifier: function(walletUrl, verifyCallback) {
      if (typeof verifyCallback !== 'function') {
        throw new Error('JWT verifier must be a function');
      }

      try {
        // Validate wallet URL
        new URL(walletUrl);
      } catch (e) {
        throw new Error('Invalid wallet URL: ' + walletUrl);
      }

      walletCallbacks.jwtVerifiers.set(walletUrl, verifyCallback);
      console.log(`JWT verifier registered for wallet: ${walletUrl}`);
      return true;
    },

    /**
     * Unregister a JWT verification callback
     * @param {string} walletUrl - The URL of the wallet
     * @returns {boolean} True if a verifier was removed
     */
    unregisterJWTVerifier: function(walletUrl) {
      const removed = walletCallbacks.jwtVerifiers.delete(walletUrl);
      if (removed) {
        console.log(`JWT verifier unregistered for wallet: ${walletUrl}`);
      }
      return removed;
    },

    /**
     * Get list of wallets that have registered JWT verifiers
     * @returns {string[]} Array of wallet URLs
     */
    getRegisteredJWTVerifiers: function() {
      return Array.from(walletCallbacks.jwtVerifiers.keys());
    }
  };

  // Also expose under a shorter alias
  window.DCWS = window.DigitalCredentialsWalletSelector;

  console.log('Wallet auto-registration API exposed');

})();
