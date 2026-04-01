/**
 * Tests for JWT Verification Callback System
 */

describe('JWT Verification Callbacks', () => {
  let walletCallbacks;
  let DCWS;

  beforeEach(() => {
    // Mock the wallet callbacks store
    walletCallbacks = {
      jwtVerifiers: new Map()
    };

    // Mock the DCWS API
    DCWS = {
      registerJWTVerifier: function(walletUrl, verifyCallback) {
        if (typeof verifyCallback !== 'function') {
          throw new Error('JWT verifier must be a function');
        }

        try {
          new URL(walletUrl);
        } catch (e) {
          throw new Error('Invalid wallet URL: ' + walletUrl);
        }

        walletCallbacks.jwtVerifiers.set(walletUrl, verifyCallback);
        return true;
      },

      unregisterJWTVerifier: function(walletUrl) {
        return walletCallbacks.jwtVerifiers.delete(walletUrl);
      },

      getRegisteredJWTVerifiers: function() {
        return Array.from(walletCallbacks.jwtVerifiers.keys());
      }
    };
  });

  describe('registerJWTVerifier', () => {
    it('should register a JWT verifier for a wallet', () => {
      const walletUrl = 'https://wallet.example.com';
      const verifier = async (jwt, options) => ({ valid: true });

      const result = DCWS.registerJWTVerifier(walletUrl, verifier);

      expect(result).toBe(true);
      expect(walletCallbacks.jwtVerifiers.has(walletUrl)).toBe(true);
      expect(walletCallbacks.jwtVerifiers.get(walletUrl)).toBe(verifier);
    });

    it('should reject non-function verifiers', () => {
      expect(() => {
        DCWS.registerJWTVerifier('https://wallet.example.com', 'not a function');
      }).toThrow('JWT verifier must be a function');
    });

    it('should reject invalid wallet URLs', () => {
      const verifier = async (jwt) => ({ valid: true });

      expect(() => {
        DCWS.registerJWTVerifier('not-a-url', verifier);
      }).toThrow('Invalid wallet URL');
    });

    it('should allow multiple wallets to register verifiers', () => {
      const wallet1 = 'https://wallet1.example.com';
      const wallet2 = 'https://wallet2.example.com';
      const verifier1 = async () => ({ valid: true });
      const verifier2 = async () => ({ valid: false });

      DCWS.registerJWTVerifier(wallet1, verifier1);
      DCWS.registerJWTVerifier(wallet2, verifier2);

      expect(walletCallbacks.jwtVerifiers.size).toBe(2);
      expect(walletCallbacks.jwtVerifiers.get(wallet1)).toBe(verifier1);
      expect(walletCallbacks.jwtVerifiers.get(wallet2)).toBe(verifier2);
    });

    it('should replace existing verifier for same wallet', () => {
      const walletUrl = 'https://wallet.example.com';
      const verifier1 = async () => ({ valid: true });
      const verifier2 = async () => ({ valid: false });

      DCWS.registerJWTVerifier(walletUrl, verifier1);
      DCWS.registerJWTVerifier(walletUrl, verifier2);

      expect(walletCallbacks.jwtVerifiers.size).toBe(1);
      expect(walletCallbacks.jwtVerifiers.get(walletUrl)).toBe(verifier2);
    });
  });

  describe('unregisterJWTVerifier', () => {
    it('should unregister a JWT verifier', () => {
      const walletUrl = 'https://wallet.example.com';
      const verifier = async () => ({ valid: true });

      DCWS.registerJWTVerifier(walletUrl, verifier);
      const result = DCWS.unregisterJWTVerifier(walletUrl);

      expect(result).toBe(true);
      expect(walletCallbacks.jwtVerifiers.has(walletUrl)).toBe(false);
    });

    it('should return false when unregistering non-existent verifier', () => {
      const result = DCWS.unregisterJWTVerifier('https://wallet.example.com');
      expect(result).toBe(false);
    });
  });

  describe('getRegisteredJWTVerifiers', () => {
    it('should return empty array when no verifiers registered', () => {
      const verifiers = DCWS.getRegisteredJWTVerifiers();
      expect(verifiers).toEqual([]);
    });

    it('should return list of registered wallet URLs', () => {
      const wallet1 = 'https://wallet1.example.com';
      const wallet2 = 'https://wallet2.example.com';
      
      DCWS.registerJWTVerifier(wallet1, async () => ({ valid: true }));
      DCWS.registerJWTVerifier(wallet2, async () => ({ valid: true }));

      const verifiers = DCWS.getRegisteredJWTVerifiers();
      
      expect(verifiers).toHaveLength(2);
      expect(verifiers).toContain(wallet1);
      expect(verifiers).toContain(wallet2);
    });
  });
});

import { OpenID4VPPlugin } from '../src/content/protocols/OpenID4VPPlugin.js';

describe('OpenID4VPPlugin - JWT Verification Integration', () => {
  let plugin;

  beforeEach(() => {
    plugin = new OpenID4VPPlugin();
  });

  describe('verifyJWT', () => {
    it('should verify JWT using wallet verifier', async () => {
      const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
      const verifier = async (jwt, options) => ({
        valid: true,
        payload: { sub: '1234' }
      });

      const result = await plugin.verifyJWT(jwt, verifier);

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual({ sub: '1234' });
    });

    it('should handle verification failure', async () => {
      const jwt = 'invalid.jwt.token';
      const verifier = async (jwt, options) => ({
        valid: false,
        error: 'Invalid signature'
      });

      const result = await plugin.verifyJWT(jwt, verifier);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should reject non-function verifiers', async () => {
      const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
      
      await expect(plugin.verifyJWT(jwt, 'not a function')).rejects.toThrow('Verifier must be a function');
    });

    it('should handle verifier that throws error', async () => {
      const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
      const verifier = async () => {
        throw new Error('Crypto error');
      };

      const result = await plugin.verifyJWT(jwt, verifier);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Crypto error');
    });

    it('should validate verifier return value structure', async () => {
      const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
      const verifier = async () => 'invalid return'; // Returns string instead of object

      const result = await plugin.verifyJWT(jwt, verifier);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must return an object');
    });

    it('should validate verifier includes valid property', async () => {
      const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
      const verifier = async () => ({ payload: {} }); // Missing 'valid' property

      const result = await plugin.verifyJWT(jwt, verifier);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must include "valid" property');
    });

    it('should pass options to verifier', async () => {
      const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
      let receivedOptions;
      
      const verifier = async (jwt, options) => {
        receivedOptions = options;
        return { valid: true };
      };

      const testOptions = {
        certificate: 'MIICert...',
        algorithm: 'ES256',
        kid: 'key-1'
      };

      await plugin.verifyJWT(jwt, verifier, testOptions);

      expect(receivedOptions).toEqual(testOptions);
    });
  });

  describe('handleRequestUri with JWT verification', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = vi.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    it('should verify JWT when verifier is provided', async () => {
      const mockJWT = 'eyJ0eXAiOiJvYXV0aC1hdXRoei1yZXErand0IiwiYWxnIjoiRVMyNTYiLCJ4NWMiOlsiTUlJQ2VydCJdfQ.eyJjbGllbnRfaWQiOiJodHRwczovL3ZlcmlmaWVyLmV4YW1wbGUuY29tIiwibm9uY2UiOiIxMjMifQ.signature';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => mockJWT
      });

      let verifierCalled = false;
      const verifier = async (jwt, options) => {
        verifierCalled = true;
        expect(jwt).toBe(mockJWT);
        expect(options.certificate).toBe('MIICert');
        expect(options.algorithm).toBe('ES256');
        return { valid: true };
      };

      const result = await plugin.handleRequestUri('https://verifier.example.com/request', {
        jwtVerifier: verifier
      });

      expect(verifierCalled).toBe(true);
      expect(result._jarSignatureVerified).toBe(true);
      expect(result.client_id).toBe('https://verifier.example.com');
    });

    it('should throw error if verification fails', async () => {
      const mockJWT = 'eyJ0eXAiOiJvYXV0aC1hdXRoei1yZXErand0IiwiYWxnIjoiRVMyNTYifQ.eyJjbGllbnRfaWQiOiJ0ZXN0In0.sig';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => mockJWT
      });

      const verifier = async () => ({
        valid: false,
        error: 'Invalid signature'
      });

      await expect(
        plugin.handleRequestUri('https://verifier.example.com/request', { jwtVerifier: verifier })
      ).rejects.toThrow('JWT signature verification failed: Invalid signature');
    });

    it('should skip verification if no verifier provided', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const mockJWT = 'eyJ0eXAiOiJvYXV0aC1hdXRoei1yZXErand0IiwiYWxnIjoiRVMyNTYifQ.eyJjbGllbnRfaWQiOiJ0ZXN0In0.sig';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => mockJWT
      });

      const result = await plugin.handleRequestUri('https://verifier.example.com/request');

      expect(result._jarSignatureVerified).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT signature verification skipped')
      );

      consoleSpy.mockRestore();
    });

    it('should extract certificate from x5c header', async () => {
      const mockJWT = 'eyJ0eXAiOiJvYXV0aC1hdXRoei1yZXErand0IiwiYWxnIjoiRVMyNTYiLCJ4NWMiOlsiQ2VydDEiLCJDZXJ0MiJdfQ.eyJub25jZSI6IjEyMyJ9.sig';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => mockJWT
      });

      const verifier = async (jwt, options) => {
        expect(options.certificate).toBe('Cert1'); // First cert in chain
        return { valid: true };
      };

      await plugin.handleRequestUri('https://verifier.example.com/request', {
        jwtVerifier: verifier
      });
    });

    it('should handle verifier throwing error', async () => {
      const mockJWT = 'eyJ0eXAiOiJvYXV0aC1hdXRoei1yZXErand0IiwiYWxnIjoiRVMyNTYifQ.eyJub25jZSI6IjEyMyJ9.sig';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => mockJWT
      });

      const verifier = async () => {
        throw new Error('Verification failed');
      };

      await expect(
        plugin.handleRequestUri('https://verifier.example.com/request', { jwtVerifier: verifier })
      ).rejects.toThrow('JWT verification error: Verification failed');
    });
  });
});
