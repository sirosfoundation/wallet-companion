# API Reference

Complete API reference for the Web Wallet Selector extension.

## Table of Contents

- [Digital Credentials API (Verifier Side)](#digital-credentials-api-verifier-side)
- [Wallet Registration API](#wallet-registration-api)
- [OpenID4VP Protocol Details](#openid4vp-protocol-details)
- [JWT Verification Callbacks](#jwt-verification-callbacks)

## Digital Credentials API (Verifier Side)

The extension intercepts standard W3C Digital Credentials API calls. Websites request credentials using the native browser API.

### Basic Request

```javascript
const credential = await navigator.credentials.get({
  digital: {
    providers: [{
      protocol: "openid4vp",
      request: {
        // OpenID4VP authorization request
        client_id: "https://verifier.example.com",
        client_id_scheme: "https",
        response_type: "vp_token",
        response_mode: "direct_post",
        response_uri: "https://verifier.example.com/callback",
        nonce: "n-0S6_WzA2Mj",
        presentation_definition: {
          id: "example-request",
          input_descriptors: [{
            id: "id_credential",
            format: { jwt_vp: { alg: ["ES256"] } },
            constraints: {
              fields: [{
                path: ["$.vc.type"],
                filter: { type: "string", const: "IdentityCredential" }
              }]
            }
          }]
        }
      }
    }]
  }
});
```

## Wallet Registration API

The `window.DCWS` (Digital Credentials Wallet Selector) API allows wallets to auto-register with the extension.

### API Object

```javascript
window.DCWS = {
  isInstalled: function() { /* ... */ },
  registerWallet: async function(walletInfo) { /* ... */ },
  isWalletRegistered: async function(url) { /* ... */ },
  registerJWTVerifier: function(walletUrl, verifyCallback) { /* ... */ },
  unregisterJWTVerifier: function(walletUrl) { /* ... */ },
  getRegisteredJWTVerifiers: function() { /* ... */ }
};

// Short alias
window.DCWS === window.DigitalCredentialsWalletSelector
```

### Methods

#### `isInstalled()`

Check if the extension is installed.

**Returns:** `boolean`

**Example:**

```javascript
if (window.DCWS?.isInstalled()) {
  console.log('Extension is installed');
}
```

#### `registerWallet(walletInfo)`

Register a wallet with the extension.

**Parameters:**

- `walletInfo` (Object) - Wallet information
  - `name` (string, required) - Display name of the wallet
  - `url` (string, required) - Wallet endpoint URL
  - `protocols` (string[], required) - Supported protocol identifiers (e.g., `['openid4vp', 'w3c-vc']`)
  - `description` (string, optional) - Description of the wallet
  - `icon` (string, optional) - Icon emoji or URL
  - `logo` (string, optional) - Logo URL (alternative to icon)
  - `color` (string, optional) - Brand color in hex format (default: `'#1C4587'`)

**Returns:** `Promise<Object>`

```typescript
{
  success: boolean;
  alreadyRegistered: boolean;
  wallet: Object;
}
```

**Example:**

```javascript
const result = await window.DCWS.registerWallet({
  name: 'MyWallet',
  url: 'https://wallet.example.com',
  protocols: ['openid4vp', 'w3c-vc'],
  description: 'My digital identity wallet',
  icon: '🔐',
  color: '#3b82f6'
});

if (result.success) {
  console.log('Registered:', result.wallet);
}
```

**Validation:**

- URL must be valid
- Protocols array must not be empty
- Protocol identifiers must match `/^[a-z0-9-]+$/` (lowercase letters, digits, hyphens)

#### `isWalletRegistered(url)`

Check if a wallet is already registered.

**Parameters:**

- `url` (string) - Wallet URL to check

**Returns:** `Promise<boolean>`

**Example:**

```javascript
const isRegistered = await window.DCWS.isWalletRegistered('https://wallet.example.com');
if (!isRegistered) {
  await window.DCWS.registerWallet({...});
}
```

#### `registerJWTVerifier(walletUrl, verifyCallback)`

Register a JWT verification callback for protocol operations.

**Parameters:**

- `walletUrl` (string) - The URL of the wallet providing the verifier
- `verifyCallback` (Function) - Async function that verifies JWT signatures

**Callback Signature:**

```typescript
async (jwt: string, options: Object) => {
  valid: boolean;
  payload?: any;
  error?: string;
}
```

**Options Parameter:**

```typescript
{
  publicKey?: string;      // PEM-formatted public key
  certificate?: string;    // PEM-formatted X.509 certificate
  algorithm?: string;      // Expected algorithm (e.g., 'ES256', 'RS256')
  issuer?: string;        // Expected issuer
  audience?: string;      // Expected audience
}
```

**Returns:** `boolean` - Success status

**Example:**

```javascript
window.DCWS.registerJWTVerifier(
  'https://wallet.example.com',
  async (jwt, options) => {
    try {
      const result = await myWalletCrypto.verifyJWT(jwt, options);
      return {
        valid: true,
        payload: result.payload,
        header: result.header
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
);
```

#### `unregisterJWTVerifier(walletUrl)`

Remove a JWT verification callback.

**Parameters:**

- `walletUrl` (string) - The URL of the wallet

**Returns:** `boolean` - True if a verifier was removed

**Example:**

```javascript
const removed = window.DCWS.unregisterJWTVerifier('https://wallet.example.com');
if (removed) {
  console.log('JWT verifier removed');
}
```

#### `getRegisteredJWTVerifiers()`

Get list of wallets that have registered JWT verifiers.

**Returns:** `string[]` - Array of wallet URLs

**Example:**

```javascript
const verifiers = window.DCWS.getRegisteredJWTVerifiers();
console.log('Wallets with verifiers:', verifiers);
// ['https://wallet.example.com', 'https://another-wallet.com']
```

## OpenID4VP Protocol Details

### Supported Client ID Schemes

- `x509_san_dns` - X.509 certificate with DNS SAN (preferred for production)
- `https` - HTTPS URL (must match request origin)
- `redirect_uri` - OAuth 2.0 redirect URI (legacy support)

### Supported Response Modes

- `direct_post` - HTTP POST to response_uri
- `direct_post.jwt` - Encrypted JWT POST to response_uri
- `fragment` - URL fragment (limited support)

### Request Formats

#### 1. Direct Parameters

All parameters inline in the request object:

```javascript
{
  protocol: "openid4vp",
  request: {
    client_id: "https://verifier.example.com",
    response_type: "vp_token",
    response_mode: "direct_post",
    response_uri: "https://verifier.example.com/callback",
    nonce: "n-0S6_WzA2Mj",
    presentation_definition: { /* Presentation Exchange v2.0 */ }
  }
}
```

#### 2. JAR (JWT-secured Authorization Request)

Request by reference using `request_uri`:

```javascript
{
  protocol: "openid4vp",
  request: {
    client_id: "https://verifier.example.com",
    request_uri: "https://verifier.example.com/request/abc123"
  }
}
```

The extension will:
1. Fetch the JWT from `request_uri`
2. Verify the JWT signature (using wallet's callback if registered)
3. Extract and validate the authorization request from the JWT payload

#### 3. DCQL (Digital Credentials Query Language)

Credential requests using DCQL format:

```javascript
{
  protocol: "openid4vp",
  request: {
    client_id: "https://verifier.example.com",
    response_type: "vp_token",
    dcql_query: {
      credentials: [{
        id: "org.example.driver_license",
        format: "vc+sd-jwt",
        claims: [
          { path: ["document_number"] },
          { path: ["driving_privileges"] }
        ]
      }]
    }
  }
}
```

### Presentation Exchange v2.0

The extension supports full Presentation Exchange v2.0 format:

```javascript
presentation_definition: {
  id: "example-request",
  input_descriptors: [{
    id: "id_credential",
    name: "Identity Credential",
    purpose: "We need to verify your identity",
    format: {
      jwt_vp: { alg: ["ES256"] }
    },
    constraints: {
      fields: [{
        path: ["$.vc.type"],
        filter: {
          type: "string",
          const: "IdentityCredential"
        }
      }, {
        path: ["$.vc.credentialSubject.age"],
        filter: {
          type: "number",
          minimum: 18
        }
      }]
    }
  }]
}
```

### Response Validation

The extension validates responses according to OpenID4VP:

**vp_token:** Must be a valid JWT or JSON object containing verifiable presentation

**presentation_submission:** Must match the Presentation Exchange format:

```javascript
{
  id: "example-submission",
  definition_id: "example-request",
  descriptor_map: [{
    id: "id_credential",
    format: "jwt_vp",
    path: "$",
    path_nested: {
      format: "jwt_vc",
      path: "$.vp.verifiableCredential[0]"
    }
  }]
}
```

## JWT Verification Callbacks

Wallets can provide their own JWT verification to:
- Avoid bundling crypto libraries in the extension
- Use wallet's preferred crypto implementation
- Support custom certificate validation
- Handle specialized algorithms

### Verification Flow

1. Extension encounters JWT (e.g., in JAR request_uri)
2. Extension checks for registered verifier for the wallet
3. If found, calls wallet's verification callback
4. Wallet verifies signature using its crypto library
5. Returns validation result to extension

### Callback Implementation

```javascript
async function verifyJWT(jwt, options) {
  // Parse JWT header and payload
  const [headerB64, payloadB64, signatureB64] = jwt.split('.');
  const header = JSON.parse(atob(headerB64));
  const payload = JSON.parse(atob(payloadB64));
  
  // Get public key from options or header
  let publicKey = options.publicKey;
  
  if (!publicKey && options.certificate) {
    // Extract public key from X.509 certificate
    publicKey = await extractPublicKeyFromCert(options.certificate);
  }
  
  if (!publicKey && header.x5c) {
    // Extract from certificate chain in header
    publicKey = await extractPublicKeyFromX5c(header.x5c);
  }
  
  // Verify signature using your crypto library
  const isValid = await cryptoLibrary.verify(
    headerB64 + '.' + payloadB64,
    signatureB64,
    publicKey,
    header.alg || options.algorithm
  );
  
  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }
  
  // Validate claims
  if (options.issuer && payload.iss !== options.issuer) {
    return { valid: false, error: 'Invalid issuer' };
  }
  
  if (options.audience && payload.aud !== options.audience) {
    return { valid: false, error: 'Invalid audience' };
  }
  
  // Check expiration
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    return { valid: false, error: 'Token expired' };
  }
  
  return {
    valid: true,
    payload: payload,
    header: header
  };
}
```

### Error Handling

Always wrap verification in try-catch and return appropriate error messages:

```javascript
window.DCWS.registerJWTVerifier(walletUrl, async (jwt, options) => {
  try {
    return await verifyJWT(jwt, options);
  } catch (error) {
    console.error('JWT verification error:', error);
    return {
      valid: false,
      error: error.message || 'Verification failed'
    };
  }
});
```

## See Also

- [Quick Start Guide](QUICKSTART.md) - Get started quickly
- [Development Guide](DEVELOPMENT.md) - Build and test the extension
- [OpenID4VP Implementation](docs/design/OPENID4VP_IMPLEMENTATION.md) - Complete protocol documentation
- [JWT Verification Callbacks](docs/design/JWT_VERIFICATION_CALLBACKS.md) - Detailed JWT callback guide
- [Wallet Management](WALLET_MANAGEMENT.md) - User guide for managing wallets
