# JWT Verification Callback System

## Overview

The Wallet Companion browser extension provides a **callback mechanism** for wallets to register JWT (JSON Web Token) verification functions. This enables wallets to validate JWTs used in protocol operations, particularly for OpenID4VP's JAR (JWT Secured Authorization Request) flow.

## Why This Is Needed

### The Problem

In OpenID4VP, verifiers often send authorization requests as signed JWTs (JAR):

1. **Verifier** creates a JWT containing the authorization request
2. JWT is signed with verifier's private key
3. JWT signature must be verified using verifier's certificate (x5c)
4. **Browser extension** needs to verify the signature before trusting the request

However, **JWT signature verification requires crypto libraries** that:
- Are too large to bundle in a lightweight browser extension
- Require complex certificate chain validation
- May differ based on algorithms (ES256, RS256, EdDSA, etc.)

### The Solution

Wallets already have robust crypto infrastructure for:
- Signing and verifying JWTs
- Certificate validation
- Supporting multiple cryptographic algorithms
- Handling key management

The **callback system** lets wallets provide their verification capabilities to the extension, avoiding code duplication and keeping the extension lightweight.

## Architecture

```
┌─────────────────────┐
│   Verifier Site     │
│                     │
│ Creates signed JAR  │
│  (authorization     │
│   request JWT)      │
└──────────┬──────────┘
           │
           │ 1. navigator.credentials.get()
           ▼
┌─────────────────────┐
│  Browser Extension  │
│                     │
│ Intercepts request  │
│ Needs to verify JWT │
└──────────┬──────────┘
           │
           │ 2. Calls registered verifier
           ▼
┌─────────────────────┐
│    Web Wallet       │
│                     │
│ Verifies JWT using  │
│ its crypto library  │
│ Returns result      │
└─────────────────────┘
```

## API Reference

### `DCWS.registerJWTVerifier(walletUrl, verifyCallback)`

Registers a JWT verification callback for a wallet.

**Parameters:**
- `walletUrl` (string): The URL of the wallet providing the verifier
- `verifyCallback` (function): Async function that verifies JWTs

**Callback Signature:**
```javascript
async function verifyCallback(jwt, options) {
  // jwt: string - The JWT to verify
  // options: {
  //   certificate?: string - Base64 encoded x.509 certificate from x5c header
  //   algorithm?: string - Algorithm from JWT header (e.g., 'ES256')
  //   kid?: string - Key ID from JWT header
  // }
  
  return {
    valid: boolean,      // REQUIRED: true if signature is valid
    payload?: object,    // Optional: decoded payload if valid
    error?: string       // Optional: error message if invalid
  };
}
```

**Returns:** `boolean` - `true` if registration succeeded

**Example:**
```javascript
// Wallet registers its JWT verifier
DCWS.registerJWTVerifier('https://wallet.example.com', async (jwt, options) => {
  try {
    // Use wallet's crypto library to verify
    const publicKey = await extractPublicKeyFromCert(options.certificate);
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      data
    );

    if (isValid) {
      const payload = parseJWTPayload(jwt);
      return { valid: true, payload };
    } else {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch (err) {
    return { valid: false, error: err.message };
  }
});
```

### `DCWS.unregisterJWTVerifier(walletUrl)`

Removes a previously registered JWT verifier.

**Parameters:**
- `walletUrl` (string): The URL of the wallet

**Returns:** `boolean` - `true` if a verifier was removed

**Example:**
```javascript
DCWS.unregisterJWTVerifier('https://wallet.example.com');
```

### `DCWS.getRegisteredJWTVerifiers()`

Gets a list of wallet URLs that have registered JWT verifiers.

**Returns:** `string[]` - Array of wallet URLs

**Example:**
```javascript
const verifiers = DCWS.getRegisteredJWTVerifiers();
console.log('Wallets with JWT verifiers:', verifiers);
// ['https://wallet1.example.com', 'https://wallet2.example.com']
```

## Integration with OpenID4VP

### How It Works

1. **Wallet Registration with Verifier**
   ```javascript
   // During wallet initialization
   await DCWS.registerWallet({
     name: 'My Wallet',
     url: 'https://wallet.example.com',
     protocols: ['openid4vp']
   });
   
   // Register JWT verifier
   DCWS.registerJWTVerifier('https://wallet.example.com', myJWTVerifier);
   ```

2. **Extension Uses Verifier**
   ```javascript
   // When processing OpenID4VP request with request_uri
   const plugin = new OpenID4VPPlugin();
   
   // Get verifier for the selected wallet
   const verifier = walletCallbacks.jwtVerifiers.get(selectedWalletUrl);
   
   // Handle JAR with verification
   const authParams = await plugin.handleRequestUri(
     'https://verifier.example.com/request/abc',
     { jwtVerifier: verifier }
   );
   
   // authParams._jarSignatureVerified === true
   ```

3. **Signature Verification Flow**
   ```javascript
   // Inside handleRequestUri()
   const jwt = await fetchJAR(requestUri);
   const header = parseJWTHeader(jwt);
   
   if (options.jwtVerifier) {
     const result = await options.jwtVerifier(jwt, {
       certificate: header.x5c[0],
       algorithm: header.alg,
       kid: header.kid
     });
     
     if (!result.valid) {
       throw new Error('JWT signature verification failed');
     }
   }
   ```

## Implementation Example

### Wallet-Side Implementation

Here's a complete example of how a wallet would implement and register a JWT verifier:

```javascript
// wallet-jwt-verifier.js
import { importX509, jwtVerify } from 'jose'; // Or your crypto library

class WalletJWTVerifier {
  constructor(walletUrl) {
    this.walletUrl = walletUrl;
  }

  /**
   * Verify a JWT signature
   * @param {string} jwt - The JWT to verify
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} Verification result
   */
  async verify(jwt, options) {
    try {
      // Extract certificate
      const certificate = options.certificate;
      if (!certificate) {
        return {
          valid: false,
          error: 'No certificate provided'
        };
      }

      // Build PEM certificate
      const pemCert = `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`;
      
      // Import public key from certificate
      const publicKey = await importX509(pemCert, options.algorithm);
      
      // Verify JWT signature
      const { payload } = await jwtVerify(jwt, publicKey);
      
      return {
        valid: true,
        payload: payload
      };
    } catch (err) {
      return {
        valid: false,
        error: `Verification failed: ${err.message}`
      };
    }
  }

  /**
   * Register this verifier with the extension
   */
  register() {
    if (typeof window.DCWS === 'undefined') {
      throw new Error('DCWS not available - extension not installed?');
    }

    const boundVerify = this.verify.bind(this);
    window.DCWS.registerJWTVerifier(this.walletUrl, boundVerify);
    console.log('JWT verifier registered');
  }

  /**
   * Unregister this verifier
   */
  unregister() {
    if (typeof window.DCWS !== 'undefined') {
      window.DCWS.unregisterJWTVerifier(this.walletUrl);
    }
  }
}

// Usage
const verifier = new WalletJWTVerifier('https://wallet.example.com');
verifier.register();
```

### Simplified Example (Using Web Crypto API)

```javascript
// Simple verifier using only Web Crypto API
async function simpleJWTVerifier(jwt, options) {
  try {
    // Parse JWT
    const [headerB64, payloadB64, signatureB64] = jwt.split('.');
    
    // Decode signature
    const signature = base64urlDecode(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    
    // Extract public key from certificate (simplified)
    const publicKey = await extractPublicKey(options.certificate);
    
    // Verify signature
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      },
      publicKey,
      signature,
      data
    );
    
    if (isValid) {
      const payload = JSON.parse(atob(payloadB64));
      return { valid: true, payload };
    } else {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Register it
window.DCWS.registerJWTVerifier(
  'https://simple-wallet.example.com',
  simpleJWTVerifier
);
```

## Security Considerations

### Wallet Responsibilities

1. **Validate Certificate Chain**
   - Verify certificate is not expired
   - Check certificate revocation status (CRL/OCSP)
   - Validate certificate trust chain

2. **Algorithm Validation**
   - Only support secure algorithms (ES256, RS256, EdDSA)
   - Reject weak algorithms (none, HS256 for asymmetric keys)

3. **Hostname Verification**
   - Ensure certificate SAN (Subject Alternative Name) matches verifier hostname
   - Prevent certificate substitution attacks

4. **Error Handling**
   - Never throw errors that leak sensitive information
   - Return structured error responses

### Extension Responsibilities

1. **Callback Validation**
   - Verify callback is a function before calling
   - Validate return value structure
   - Handle callback errors gracefully

2. **Timeout Handling**
   - Implement reasonable timeouts for verifier calls
   - Don't block indefinitely

3. **Fallback Behavior**
   - Continue without verification if no verifier registered (with warnings)
   - Log when verification is skipped

## Testing

### Test Coverage

The implementation includes 21 comprehensive tests:

```bash
npm test -- tests/jwt-verification.test.js
```

**Test Categories:**
- ✅ Verifier registration (5 tests)
- ✅ Verifier unregistration (2 tests)
- ✅ Verifier listing (2 tests)
- ✅ JWT verification (6 tests)
- ✅ OpenID4VP integration (6 tests)

### Testing Your Verifier

```javascript
// Test your verifier
const testJWT = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.signature';
const testOptions = {
  certificate: 'MIIC...',
  algorithm: 'ES256'
};

const result = await myVerifier(testJWT, testOptions);
console.assert(result.hasOwnProperty('valid'), 'Result must have valid property');
console.assert(typeof result.valid === 'boolean', 'valid must be boolean');
```

## Performance Considerations

### Optimization Tips

1. **Cache Public Keys**
   ```javascript
   const keyCache = new Map();
   
   async function cachedVerifier(jwt, options) {
     const certHash = await sha256(options.certificate);
     
     let publicKey = keyCache.get(certHash);
     if (!publicKey) {
       publicKey = await extractPublicKey(options.certificate);
       keyCache.set(certHash, publicKey);
     }
     
     // Verify using cached key
     return verify(jwt, publicKey);
   }
   ```

2. **Async Operations**
   - Always return Promises
   - Don't block the main thread
   - Use Web Workers for heavy crypto operations

3. **Early Validation**
   ```javascript
   async function optimizedVerifier(jwt, options) {
     // Quick checks first
     if (!jwt || !options.certificate) {
       return { valid: false, error: 'Missing required parameters' };
     }
     
     // Expensive verification last
     return await fullVerification(jwt, options);
   }
   ```

## Troubleshooting

### Common Issues

**Verifier not called:**
- Check wallet URL matches exactly (including trailing slash)
- Verify DCWS API is available (`typeof window.DCWS !== 'undefined'`)
- Check browser console for registration errors

**Verification always fails:**
- Verify certificate format (base64, no PEM headers)
- Check algorithm matches JWT header
- Validate certificate is not expired
- Test with known-good JWT

**Performance issues:**
- Implement key caching
- Consider Web Workers for verification
- Profile crypto operations

## Future Enhancements

1. **Certificate Chain Support**
   - Pass full x5c chain to verifier
   - Enable intermediate certificate validation

2. **Algorithm Negotiation**
   - Allow wallets to advertise supported algorithms
   - Extension can check compatibility

3. **Verification Metrics**
   - Track verification success/failure rates
   - Performance monitoring

4. **Revocation Checking**
   - Standard interface for CRL/OCSP checks
   - Cache revocation status

## Related Documentation

- [OpenID4VP Implementation](./OPENID4VP_IMPLEMENTATION.md)
- [Protocol Support](./PROTOCOL_SUPPORT.md)
- [Wallet API](./WALLET_API.md)

## References

- [RFC 7515 - JSON Web Signature (JWS)](https://www.rfc-editor.org/rfc/rfc7515.html)
- [RFC 9101 - JWT Secured Authorization Request (JAR)](https://www.rfc-editor.org/rfc/rfc9101.html)
- [OpenID4VP Specification](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)
