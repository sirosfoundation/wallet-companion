/**
 * OpenID4VP Protocol Plugin
 * Based on wwWallet implementation (https://github.com/wwWallet)
 * 
 * Implements OpenID for Verifiable Presentations (OpenID4VP) protocol
 * for requesting and presenting verifiable credentials.
 * 
 * References:
 * - OpenID4VP spec: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html
 * - wwWallet implementation: wallet-frontend/src/lib/services/OpenID4VP/OpenID4VP.ts
 */

(function(root, factory) {
  'use strict';
  
  // Universal Module Definition (UMD) pattern
  // Supports CommonJS, AMD, and browser globals
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS - get ProtocolPlugin from protocols.js
    const { ProtocolPlugin } = require('../protocols.js');
    module.exports = factory(ProtocolPlugin);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['ProtocolPlugin'], factory);
  } else {
    // Browser globals
    if (!root.ProtocolPlugin) {
      console.error('ProtocolPlugin base class not found. Make sure protocols.js is loaded first.');
      return;
    }
    const OpenID4VPPlugin = factory(root.ProtocolPlugin);
    root.OpenID4VPPlugin = OpenID4VPPlugin;
    
    // Store plugins to be registered
    if (!root._pendingProtocolPlugins) {
      root._pendingProtocolPlugins = [];
    }
    
    // Add OpenID4VP variants to pending list
    root._pendingProtocolPlugins.push(
      new OpenID4VPPlugin(),              // openid4vp
      new OpenID4VPPlugin('v1-unsigned'), // openid4vp-v1-unsigned
      new OpenID4VPPlugin('v1-signed')    // openid4vp-v1-signed
    );
    
    console.log('OpenID4VPPlugin variants queued for registration:', root._pendingProtocolPlugins.length);
  }
})(typeof window !== 'undefined' ? window : this, function(ProtocolPlugin) {
  'use strict';

  console.log('OpenID4VPPlugin.js loaded');

class OpenID4VPPlugin extends ProtocolPlugin {
  constructor(variant = '') {
    super();
    this.variant = variant;
  }

  getProtocolId() {
    return this.variant ? `openid4vp-${this.variant}` : 'openid4vp';
  }

  /**
   * Parse and validate OpenID4VP authorization request
   * 
   * The request can come in two forms:
   * 1. Direct parameters in URL query string
   * 2. Reference via request_uri (JAR - JWT Authorization Request)
   * 
   * @param {Object} requestData - Raw request data from navigator.credentials.get
   * @returns {Object} Validated and formatted request data
   */
  prepareRequest(requestData) {
    // Validate request structure
    if (!requestData || typeof requestData !== 'object') {
      throw new Error('OpenID4VP request data must be an object');
    }

    console.log('[OpenID4VPPlugin] prepareRequest called with:', JSON.stringify(requestData, null, 2));

    // For Digital Credentials API, the request data is already well-formed
    // It contains the full authorization request object
    // We just add metadata and pass it through
    if (requestData.client_metadata || requestData.dcql_query || requestData.nonce) {
      // This is a DC API request - pass through with minimal processing
      console.log('[OpenID4VPPlugin] DC API request detected, passing through');
      return {
        ...requestData,
        protocol: this.getProtocolId(),
        timestamp: new Date().toISOString()
      };
    }

    // For traditional OpenID4VP flows, parse the authorization request
    const authRequest = this._parseAuthorizationRequest(requestData);

    // Validate required parameters
    this._validateAuthorizationRequest(authRequest);

    // Return prepared request with metadata
    return {
      ...authRequest,
      protocol: this.getProtocolId(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse authorization request from Digital Credentials API data
   * 
   * Expected formats:
   * - URL with query parameters (openid4vp://?client_id=...&request_uri=...)
   * - Object with parsed parameters
   * 
   * @private
   */
  _parseAuthorizationRequest(requestData) {
    // If requestData has a 'url' field, parse it
    if (requestData.url && typeof requestData.url === 'string') {
      return this._parseUrlParams(requestData.url);
    }

    // If requestData is already parsed parameters, validate and use them
    if (requestData.client_id || requestData.request_uri) {
      return requestData;
    }

    throw new Error('Invalid OpenID4VP request format: missing url or parameters');
  }

  /**
   * Parse URL parameters from authorization request
   * 
   * @private
   */
  _parseUrlParams(url) {
    try {
      const authUrl = new URL(url);
      const params = authUrl.searchParams;

      return {
        client_id: params.get('client_id'),
        request_uri: params.get('request_uri'),
        response_uri: params.get('response_uri'),
        nonce: params.get('nonce'),
        state: params.get('state'),
        presentation_definition: params.get('presentation_definition')
          ? JSON.parse(params.get('presentation_definition'))
          : null,
        presentation_definition_uri: params.get('presentation_definition_uri'),
        client_metadata: params.get('client_metadata')
          ? JSON.parse(params.get('client_metadata'))
          : null,
        response_mode: params.get('response_mode'),
        dcql_query: params.get('dcql_query')
          ? JSON.parse(params.get('dcql_query'))
          : null,
      };
    } catch (err) {
      throw new Error(`Failed to parse OpenID4VP URL: ${err.message}`);
    }
  }

  /**
   * Validate authorization request has required parameters
   * 
   * According to OpenID4VP spec and wwWallet implementation:
   * - MUST have client_id
   * - MUST have either presentation_definition, presentation_definition_uri, or request_uri
   * - client_id_scheme should be 'x509_san_dns' (for security)
   * 
   * @private
   */
  _validateAuthorizationRequest(authRequest) {
    // Validate client_id
    if (!authRequest.client_id) {
      throw new Error('OpenID4VP request must include client_id');
    }

    // Validate client_id_scheme (wwWallet only supports x509_san_dns)
    const client_id_scheme = authRequest.client_id.split(':')[0];
    if (client_id_scheme !== 'x509_san_dns' && !authRequest.client_id.startsWith('http')) {
      console.warn(`OpenID4VP: client_id_scheme '${client_id_scheme}' may not be supported. Expected 'x509_san_dns' or https URL`);
    }

    // Must have one of: request_uri, presentation_definition, or presentation_definition_uri
    if (!authRequest.request_uri && 
        !authRequest.presentation_definition && 
        !authRequest.presentation_definition_uri &&
        !authRequest.dcql_query) {
      throw new Error(
        'OpenID4VP request must include request_uri, presentation_definition, presentation_definition_uri, or dcql_query'
      );
    }

    // If using JAR (request_uri), it's required to fetch and validate JWT
    if (authRequest.request_uri) {
      console.log('OpenID4VP: request_uri detected, requires JWT validation');
    }

    // Validate response_mode if present
    if (authRequest.response_mode) {
      const validModes = ['direct_post', 'direct_post.jwt'];
      if (!validModes.includes(authRequest.response_mode)) {
        throw new Error(`Invalid response_mode: ${authRequest.response_mode}. Must be one of: ${validModes.join(', ')}`);
      }
    }
  }

  /**
   * Validate response data from wallet
   * 
   * Response formats (based on wwWallet):
   * 1. VP token (Verifiable Presentation as JWT)
   * 2. Presentation submission (descriptor mapping)
   * 3. State (if provided in request)
   * 
   * For encrypted responses (direct_post.jwt):
   * - JWE with vp_token and presentation_submission as payload
   * 
   * @param {Object} responseData - Response data from wallet
   * @returns {Object} Validated response data
   */
  validateResponse(responseData) {
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Invalid OpenID4VP response');
    }

    // Response should contain either:
    // 1. vp_token + presentation_submission (standard response)
    // 2. response (encrypted JWE containing vp_token and presentation_submission)
    
    if (!responseData.vp_token && !responseData.response) {
      throw new Error('OpenID4VP response must include vp_token or encrypted response');
    }

    // If vp_token is present, presentation_submission should also be present
    if (responseData.vp_token && !responseData.presentation_submission) {
      console.warn('OpenID4VP: vp_token present but missing presentation_submission');
    }

    // Validate presentation_submission structure if present
    if (responseData.presentation_submission) {
      this._validatePresentationSubmission(responseData.presentation_submission);
    }

    return responseData;
  }

  /**
   * Validate presentation submission structure
   * 
   * According to DIF Presentation Exchange spec:
   * - MUST have id
   * - MUST have definition_id
   * - MUST have descriptor_map array
   * 
   * @private
   */
  _validatePresentationSubmission(submission) {
    if (!submission.id) {
      throw new Error('Presentation submission must include id');
    }

    if (!submission.definition_id) {
      throw new Error('Presentation submission must include definition_id');
    }

    if (!Array.isArray(submission.descriptor_map)) {
      throw new Error('Presentation submission must include descriptor_map array');
    }

    // Validate each descriptor in the map
    submission.descriptor_map.forEach((descriptor, index) => {
      if (!descriptor.id) {
        throw new Error(`Descriptor ${index} missing id`);
      }
      if (!descriptor.format) {
        throw new Error(`Descriptor ${index} missing format`);
      }
      if (!descriptor.path) {
        throw new Error(`Descriptor ${index} missing path`);
      }
    });
  }

  /**
   * Format the request for transmission to the wallet
   * 
   * This method prepares the OpenID4VP request in a format suitable
   * for the web wallet to process.
   * 
   * @param {Object} preparedRequest - Output from prepareRequest()
   * @param {string} walletUrl - Target wallet URL
   * @returns {Object} Request ready for transmission
   */
  formatForWallet(preparedRequest, walletUrl) {
    // Build the authorization request URL for the wallet
    // The wallet will receive this as an openid4vp:// URL or via query parameters
    
    const params = new URLSearchParams();
    
    // Add required parameters
    if (preparedRequest.client_id) {
      params.set('client_id', preparedRequest.client_id);
    }
    
    if (preparedRequest.request_uri) {
      // If using JAR, only request_uri and client_id are needed
      params.set('request_uri', preparedRequest.request_uri);
    } else {
      // Include all parameters directly
      if (preparedRequest.response_uri) {
        params.set('response_uri', preparedRequest.response_uri);
      }
      if (preparedRequest.nonce) {
        params.set('nonce', preparedRequest.nonce);
      }
      if (preparedRequest.state) {
        params.set('state', preparedRequest.state);
      }
      if (preparedRequest.presentation_definition) {
        params.set('presentation_definition', JSON.stringify(preparedRequest.presentation_definition));
      }
      if (preparedRequest.presentation_definition_uri) {
        params.set('presentation_definition_uri', preparedRequest.presentation_definition_uri);
      }
      if (preparedRequest.client_metadata) {
        params.set('client_metadata', JSON.stringify(preparedRequest.client_metadata));
      }
      if (preparedRequest.response_mode) {
        params.set('response_mode', preparedRequest.response_mode);
      }
      if (preparedRequest.dcql_query) {
        params.set('dcql_query', JSON.stringify(preparedRequest.dcql_query));
      }
    }

    // Build the final URL for the wallet
    const walletAuthUrl = `${walletUrl}?${params.toString()}`;

    return {
      protocol: this.getProtocolId(),
      walletUrl: walletUrl,
      authorizationUrl: walletAuthUrl,
      requestData: preparedRequest,
    };
  }

  /**
   * Helper method to extract presentation definition
   * This would typically be called by the browser extension to fetch
   * the presentation_definition if only presentation_definition_uri is provided
   * 
   * @param {string} uri - URL to fetch presentation definition from
   * @returns {Promise<Object>} Presentation definition object
   */
  async fetchPresentationDefinition(uri) {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch presentation definition: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      throw new Error(`Error fetching presentation definition from ${uri}: ${err.message}`);
    }
  }

  /**
   * Helper method to handle request_uri (JAR - JWT Secured Authorization Request)
   * 
   * According to wwWallet implementation:
   * 1. Fetch JWT from request_uri
   * 2. Verify JWT signature using x5c certificate
   * 3. Validate hostname matches between request_uri and response_uri
   * 4. Extract authorization parameters from JWT payload
   * 
   * @param {string} requestUri - URL to fetch JAR from
   * @param {Object} options - Optional verification options
   * @param {Function} options.jwtVerifier - Optional wallet-provided JWT verifier
   * @returns {Promise<Object>} Parsed and validated authorization parameters
   */
  async handleRequestUri(requestUri, options = {}) {
    try {
      const response = await fetch(requestUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch request_uri: ${response.statusText}`);
      }

      const jwt = await response.text();
      
      // Parse JWT (header.payload.signature)
      const [headerB64, payloadB64, signature] = jwt.split('.');
      
      // Decode header and payload
      const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

      // Validate JWT type
      if (header.typ !== 'oauth-authz-req+jwt') {
        throw new Error('Invalid JWT type: expected oauth-authz-req+jwt');
      }

      // Verify JWT signature if a verifier is provided
      if (options.jwtVerifier && typeof options.jwtVerifier === 'function') {
        console.log('OpenID4VP: Verifying JWT signature using wallet-provided verifier');
        
        const verificationOptions = {
          certificate: header.x5c?.[0], // First certificate in chain
          algorithm: header.alg,
          kid: header.kid
        };

        try {
          const verificationResult = await options.jwtVerifier(jwt, verificationOptions);
          
          if (!verificationResult.valid) {
            throw new Error(`JWT signature verification failed: ${verificationResult.error || 'Invalid signature'}`);
          }
          
          console.log('OpenID4VP: JWT signature verified successfully');
        } catch (err) {
          throw new Error(`JWT verification error: ${err.message}`);
        }
      } else {
        // No verifier provided - log warning
        console.warn('OpenID4VP: JWT signature verification skipped - no verifier provided');
        console.warn('To enable verification, register a JWT verifier via DCWS.registerJWTVerifier()');
      }

      // Return parsed authorization parameters
      return {
        ...payload,
        _jarHeader: header, // Include header for certificate validation
        _jarSignatureVerified: !!options.jwtVerifier, // Indicate if signature was verified
      };
    } catch (err) {
      throw new Error(`Error handling request_uri: ${err.message}`);
    }
  }

  /**
   * Verify a JWT using a wallet-provided verifier
   * This is a helper method that can be called directly
   * 
   * @param {string} jwt - The JWT to verify
   * @param {Function} verifier - The verification function
   * @param {Object} options - Verification options (certificate, algorithm, etc.)
   * @returns {Promise<Object>} Verification result
   */
  async verifyJWT(jwt, verifier, options = {}) {
    if (typeof verifier !== 'function') {
      throw new Error('Verifier must be a function');
    }

    try {
      const result = await verifier(jwt, options);
      
      if (!result || typeof result !== 'object') {
        throw new Error('Verifier must return an object with {valid, payload?, error?}');
      }

      if (!result.hasOwnProperty('valid')) {
        throw new Error('Verifier result must include "valid" property');
      }

      return result;
    } catch (err) {
      return {
        valid: false,
        error: err.message
      };
    }
  }
}

  return OpenID4VPPlugin;
});
