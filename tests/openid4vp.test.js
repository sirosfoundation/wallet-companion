/**
 * Tests for OpenID4VP Protocol Plugin
 * Based on wwWallet implementation patterns
 */

import { OpenID4VPPlugin } from '../src/content/protocols/OpenID4VPPlugin.js';

describe('OpenID4VPPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new OpenID4VPPlugin();
  });

  describe('Protocol Identification', () => {
    it('should have correct protocol ID', () => {
      expect(plugin.getProtocolId()).toBe('openid4vp');
    });
  });

  describe('Request Preparation - Direct Parameters', () => {
    it('should prepare request with URL containing all parameters', () => {
      const requestData = {
        url: 'openid4vp://?client_id=x509_san_dns:verifier.example.com&request_uri=https://verifier.example.com/request/abc123'
      };

      const prepared = plugin.prepareRequest(requestData);

      expect(prepared).toHaveProperty('client_id', 'x509_san_dns:verifier.example.com');
      expect(prepared).toHaveProperty('request_uri', 'https://verifier.example.com/request/abc123');
      expect(prepared).toHaveProperty('protocol', 'openid4vp');
      expect(prepared).toHaveProperty('timestamp');
    });

    it('should prepare request with presentation_definition', () => {
      const presentationDef = {
        id: 'test-def-123',
        input_descriptors: [{
          id: 'credential-1',
          format: { jwt_vc: { alg: ['ES256'] } },
          constraints: {
            fields: [{
              path: ['$.credentialSubject.name']
            }]
          }
        }]
      };

      const requestData = {
        url: `openid4vp://?client_id=https://verifier.example.com&presentation_definition=${encodeURIComponent(JSON.stringify(presentationDef))}&response_uri=https://verifier.example.com/callback&nonce=abc123`
      };

      const prepared = plugin.prepareRequest(requestData);

      expect(prepared.client_id).toBe('https://verifier.example.com');
      expect(prepared.presentation_definition).toEqual(presentationDef);
      expect(prepared.response_uri).toBe('https://verifier.example.com/callback');
      expect(prepared.nonce).toBe('abc123');
    });

    it('should prepare request with presentation_definition_uri', () => {
      const requestData = {
        url: 'openid4vp://?client_id=x509_san_dns:verifier.example.com&presentation_definition_uri=https://verifier.example.com/definitions/123&response_uri=https://verifier.example.com/callback&nonce=xyz789'
      };

      const prepared = plugin.prepareRequest(requestData);

      expect(prepared.presentation_definition_uri).toBe('https://verifier.example.com/definitions/123');
      expect(prepared.nonce).toBe('xyz789');
    });

    it('should prepare request with DCQL query', () => {
      const dcqlQuery = {
        credentials: [{
          id: 'cred-1',
          format: 'vc+sd-jwt',
          meta: { vct_values: ['https://example.com/credentials/employee'] },
          claims: [{ path: ['name'] }, { path: ['email'] }]
        }]
      };

      const requestData = {
        url: `openid4vp://?client_id=https://verifier.example.com&dcql_query=${encodeURIComponent(JSON.stringify(dcqlQuery))}&response_uri=https://verifier.example.com/callback&nonce=dcql123`
      };

      const prepared = plugin.prepareRequest(requestData);

      expect(prepared.dcql_query).toEqual(dcqlQuery);
    });

    it('should parse client_metadata', () => {
      const clientMetadata = {
        client_name: 'Example Verifier',
        authorization_encrypted_response_alg: 'ECDH-ES',
        authorization_encrypted_response_enc: 'A256GCM'
      };

      const requestData = {
        url: `openid4vp://?client_id=https://verifier.example.com&request_uri=https://verifier.example.com/req&client_metadata=${encodeURIComponent(JSON.stringify(clientMetadata))}`
      };

      const prepared = plugin.prepareRequest(requestData);

      expect(prepared.client_metadata).toEqual(clientMetadata);
    });

    it('should parse response_mode', () => {
      const requestData = {
        url: 'openid4vp://?client_id=https://verifier.example.com&request_uri=https://verifier.example.com/req&response_mode=direct_post.jwt'
      };

      const prepared = plugin.prepareRequest(requestData);

      expect(prepared.response_mode).toBe('direct_post.jwt');
    });
  });

  describe('Request Preparation - Parsed Parameters', () => {
    it('should accept already-parsed parameters', () => {
      const requestData = {
        client_id: 'x509_san_dns:verifier.example.com',
        request_uri: 'https://verifier.example.com/request/123',
        nonce: 'test-nonce',
        state: 'test-state'
      };

      const prepared = plugin.prepareRequest(requestData);

      expect(prepared.client_id).toBe('x509_san_dns:verifier.example.com');
      expect(prepared.request_uri).toBe('https://verifier.example.com/request/123');
      expect(prepared.nonce).toBe('test-nonce');
      expect(prepared.state).toBe('test-state');
    });
  });

  describe('Request Validation', () => {
    it('should reject request without client_id', () => {
      const requestData = {
        url: 'openid4vp://?request_uri=https://verifier.example.com/req'
      };

      expect(() => plugin.prepareRequest(requestData)).toThrow('must include client_id');
    });

    it('should reject request without presentation mechanism', () => {
      const requestData = {
        url: 'openid4vp://?client_id=https://verifier.example.com&response_uri=https://verifier.example.com/callback'
      };

      expect(() => plugin.prepareRequest(requestData)).toThrow(
        'must include request_uri, presentation_definition, presentation_definition_uri, or dcql_query'
      );
    });

    it('should warn on unsupported client_id_scheme', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const requestData = {
        url: 'openid4vp://?client_id=did:web:verifier.example.com&request_uri=https://verifier.example.com/req'
      };

      plugin.prepareRequest(requestData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("client_id_scheme 'did' may not be supported")
      );

      consoleSpy.mockRestore();
    });

    it('should accept x509_san_dns client_id_scheme', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const requestData = {
        url: 'openid4vp://?client_id=x509_san_dns:verifier.example.com&request_uri=https://verifier.example.com/req'
      };

      plugin.prepareRequest(requestData);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should accept https URL as client_id', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const requestData = {
        url: 'openid4vp://?client_id=https://verifier.example.com&request_uri=https://verifier.example.com/req'
      };

      plugin.prepareRequest(requestData);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should reject invalid response_mode', () => {
      const requestData = {
        url: 'openid4vp://?client_id=https://verifier.example.com&request_uri=https://verifier.example.com/req&response_mode=invalid_mode'
      };

      expect(() => plugin.prepareRequest(requestData)).toThrow('Invalid response_mode');
    });

    it('should accept valid response_mode: direct_post', () => {
      const requestData = {
        url: 'openid4vp://?client_id=https://verifier.example.com&request_uri=https://verifier.example.com/req&response_mode=direct_post'
      };

      const prepared = plugin.prepareRequest(requestData);
      expect(prepared.response_mode).toBe('direct_post');
    });

    it('should accept valid response_mode: direct_post.jwt', () => {
      const requestData = {
        url: 'openid4vp://?client_id=https://verifier.example.com&request_uri=https://verifier.example.com/req&response_mode=direct_post.jwt'
      };

      const prepared = plugin.prepareRequest(requestData);
      expect(prepared.response_mode).toBe('direct_post.jwt');
    });

    it('should reject null request data', () => {
      expect(() => plugin.prepareRequest(null)).toThrow('must be an object');
    });

    it('should reject string request data', () => {
      expect(() => plugin.prepareRequest('invalid')).toThrow('must be an object');
    });

    it('should reject request without url or parameters', () => {
      expect(() => plugin.prepareRequest({})).toThrow('Invalid OpenID4VP request format');
    });
  });

  describe('Response Validation', () => {
    it('should validate response with vp_token and presentation_submission', () => {
      const responseData = {
        vp_token: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...',
        presentation_submission: {
          id: 'submission-123',
          definition_id: 'definition-123',
          descriptor_map: [{
            id: 'credential-1',
            format: 'jwt_vp',
            path: '$'
          }]
        }
      };

      const validated = plugin.validateResponse(responseData);

      expect(validated).toEqual(responseData);
    });

    it('should validate response with encrypted response', () => {
      const responseData = {
        response: 'eyJhbGciOiJFQ0RILUVTIiwiZW5jIjoiQTI1NkdDTSJ9...' // JWE
      };

      const validated = plugin.validateResponse(responseData);

      expect(validated).toEqual(responseData);
    });

    it('should validate response with state', () => {
      const responseData = {
        vp_token: 'eyJhbGciOiJFUzI1NiJ9...',
        presentation_submission: {
          id: 'sub-1',
          definition_id: 'def-1',
          descriptor_map: [{
            id: 'cred-1',
            format: 'jwt_vp',
            path: '$'
          }]
        },
        state: 'original-state-123'
      };

      const validated = plugin.validateResponse(responseData);

      expect(validated.state).toBe('original-state-123');
    });

    it('should reject response without vp_token or encrypted response', () => {
      const responseData = {
        presentation_submission: {
          id: 'sub-1',
          definition_id: 'def-1',
          descriptor_map: []
        }
      };

      expect(() => plugin.validateResponse(responseData)).toThrow(
        'must include vp_token or encrypted response'
      );
    });

    it('should warn if vp_token present but presentation_submission missing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const responseData = {
        vp_token: 'eyJhbGciOiJFUzI1NiJ9...'
      };

      plugin.validateResponse(responseData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing presentation_submission')
      );

      consoleSpy.mockRestore();
    });

    it('should reject null response data', () => {
      expect(() => plugin.validateResponse(null)).toThrow('Invalid OpenID4VP response');
    });

    it('should reject string response data', () => {
      expect(() => plugin.validateResponse('invalid')).toThrow('Invalid OpenID4VP response');
    });
  });

  describe('Presentation Submission Validation', () => {
    it('should validate complete presentation submission', () => {
      const responseData = {
        vp_token: 'token',
        presentation_submission: {
          id: 'submission-abc',
          definition_id: 'definition-xyz',
          descriptor_map: [
            {
              id: 'input-1',
              format: 'jwt_vp',
              path: '$'
            },
            {
              id: 'input-2',
              format: 'ldp_vp',
              path: '$.verifiableCredential[0]'
            }
          ]
        }
      };

      const validated = plugin.validateResponse(responseData);
      expect(validated).toEqual(responseData);
    });

    it('should reject submission without id', () => {
      const responseData = {
        vp_token: 'token',
        presentation_submission: {
          definition_id: 'def-1',
          descriptor_map: [{
            id: 'desc-1',
            format: 'jwt_vp',
            path: '$'
          }]
        }
      };

      expect(() => plugin.validateResponse(responseData)).toThrow('must include id');
    });

    it('should reject submission without definition_id', () => {
      const responseData = {
        vp_token: 'token',
        presentation_submission: {
          id: 'sub-1',
          descriptor_map: [{
            id: 'desc-1',
            format: 'jwt_vp',
            path: '$'
          }]
        }
      };

      expect(() => plugin.validateResponse(responseData)).toThrow('must include definition_id');
    });

    it('should reject submission without descriptor_map array', () => {
      const responseData = {
        vp_token: 'token',
        presentation_submission: {
          id: 'sub-1',
          definition_id: 'def-1'
        }
      };

      expect(() => plugin.validateResponse(responseData)).toThrow('must include descriptor_map array');
    });

    it('should reject descriptor without id', () => {
      const responseData = {
        vp_token: 'token',
        presentation_submission: {
          id: 'sub-1',
          definition_id: 'def-1',
          descriptor_map: [{
            format: 'jwt_vp',
            path: '$'
          }]
        }
      };

      expect(() => plugin.validateResponse(responseData)).toThrow('Descriptor 0 missing id');
    });

    it('should reject descriptor without format', () => {
      const responseData = {
        vp_token: 'token',
        presentation_submission: {
          id: 'sub-1',
          definition_id: 'def-1',
          descriptor_map: [{
            id: 'desc-1',
            path: '$'
          }]
        }
      };

      expect(() => plugin.validateResponse(responseData)).toThrow('Descriptor 0 missing format');
    });

    it('should reject descriptor without path', () => {
      const responseData = {
        vp_token: 'token',
        presentation_submission: {
          id: 'sub-1',
          definition_id: 'def-1',
          descriptor_map: [{
            id: 'desc-1',
            format: 'jwt_vp'
          }]
        }
      };

      expect(() => plugin.validateResponse(responseData)).toThrow('Descriptor 0 missing path');
    });
  });

  describe('Format for Wallet', () => {
    it('should format request with request_uri (JAR)', () => {
      const preparedRequest = {
        client_id: 'x509_san_dns:verifier.example.com',
        request_uri: 'https://verifier.example.com/requests/abc123'
      };

      const formatted = plugin.formatForWallet(preparedRequest, 'https://wallet.example.com');

      expect(formatted.protocol).toBe('openid4vp');
      expect(formatted.walletUrl).toBe('https://wallet.example.com');
      expect(formatted.authorizationUrl).toContain('client_id=x509_san_dns%3Averifier.example.com');
      expect(formatted.authorizationUrl).toContain('request_uri=https%3A%2F%2Fverifier.example.com%2Frequests%2Fabc123');
      expect(formatted.requestData).toEqual(preparedRequest);
    });

    it('should format request with all direct parameters', () => {
      const preparedRequest = {
        client_id: 'https://verifier.example.com',
        response_uri: 'https://verifier.example.com/callback',
        nonce: 'nonce-123',
        state: 'state-456',
        presentation_definition: { id: 'pd-1', input_descriptors: [] },
        response_mode: 'direct_post'
      };

      const formatted = plugin.formatForWallet(preparedRequest, 'https://wallet.example.com');

      expect(formatted.authorizationUrl).toContain('client_id=https%3A%2F%2Fverifier.example.com');
      expect(formatted.authorizationUrl).toContain('response_uri=https%3A%2F%2Fverifier.example.com%2Fcallback');
      expect(formatted.authorizationUrl).toContain('nonce=nonce-123');
      expect(formatted.authorizationUrl).toContain('state=state-456');
      expect(formatted.authorizationUrl).toContain('response_mode=direct_post');
      expect(formatted.authorizationUrl).toContain('presentation_definition=');
    });

    it('should include DCQL query in formatted request', () => {
      const preparedRequest = {
        client_id: 'https://verifier.example.com',
        response_uri: 'https://verifier.example.com/callback',
        nonce: 'nonce-123',
        dcql_query: { credentials: [{ id: 'cred-1', format: 'vc+sd-jwt' }] }
      };

      const formatted = plugin.formatForWallet(preparedRequest, 'https://wallet.example.com');

      expect(formatted.authorizationUrl).toContain('dcql_query=');
    });
  });
});
