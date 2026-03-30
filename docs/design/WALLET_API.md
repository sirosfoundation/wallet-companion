# Wallet Auto-Registration API

## Overview

The Web Wallet Selector extension provides a JavaScript API that allows digital identity wallets to automatically detect the extension and register themselves with the user's browser. This enables seamless integration without requiring users to manually configure wallet endpoints.

## API Reference

### Namespace

The API is exposed through the global `window` object:

```javascript
window.DigitalCredentialsWalletSelector
// or the shorter alias:
window.DCWS
```

### Detection

#### `isInstalled()`

Check if the extension is installed.

**Returns:** `boolean` - `true` if the extension is installed and active

**Example:**
```javascript
if (window.DigitalCredentialsWalletSelector && 
    window.DigitalCredentialsWalletSelector.isInstalled()) {
  console.log('Extension is installed!');
}
```

### Registration

#### `registerWallet(walletInfo)`

Register the wallet with the extension. If the wallet is already registered (by URL), this method returns the existing wallet information.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `walletInfo` | `Object` | Yes | Wallet information object |
| `walletInfo.name` | `string` | Yes | Display name of the wallet |
| `walletInfo.url` | `string` | Yes | Wallet endpoint URL (must be valid) |
| `walletInfo.description` | `string` | No | Brief description of the wallet |
| `walletInfo.icon` | `string` | No | Emoji or URL for the wallet icon |
| `walletInfo.logo` | `string` | No | Logo URL (alternative to icon) |
| `walletInfo.color` | `string` | No | Brand color (hex format, default: #3b82f6) |

**Returns:** `Promise<Object>` with the following structure:

```javascript
{
  success: true,
  alreadyRegistered: false,  // true if wallet was already registered
  wallet: {
    id: "wallet-1234567890-abc123",
    name: "My Wallet",
    url: "https://wallet.example.com",
    // ... other wallet properties
  }
}
```

**Throws:** `Error` if registration fails

**Example:**
```javascript
try {
  const result = await window.DCWS.registerWallet({
    name: 'MyWallet',
    url: 'https://wallet.example.com',
    description: 'Secure digital identity wallet',
    icon: '🔐',
    color: '#ff6b6b'
  });
  
  if (result.alreadyRegistered) {
    console.log('Wallet was already registered');
  } else {
    console.log('Wallet successfully registered!', result.wallet);
  }
} catch (error) {
  console.error('Registration failed:', error);
}
```

#### `isWalletRegistered(url)`

Check if a wallet with the given URL is already registered.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | `string` | Yes | Wallet endpoint URL to check |

**Returns:** `Promise<boolean>` - `true` if the wallet is registered

**Example:**
```javascript
const isRegistered = await window.DCWS.isWalletRegistered('https://wallet.example.com');

if (!isRegistered) {
  // Register the wallet
  await window.DCWS.registerWallet({ ... });
}
```

## Integration Guide

### Basic Integration

Add this code to your wallet's landing page or application:

```javascript
(async function() {
  // Check if extension is installed
  if (!window.DigitalCredentialsWalletSelector?.isInstalled()) {
    console.log('Extension not installed');
    return;
  }
  
  // Define your wallet info
  const myWalletInfo = {
    name: 'MyWallet',
    url: window.location.origin,  // or your specific endpoint
    description: 'Your trusted digital identity wallet',
    icon: '🔐',
    color: '#4f46e5'
  };
  
  // Check if already registered
  const isRegistered = await window.DCWS.isWalletRegistered(myWalletInfo.url);
  
  if (isRegistered) {
    console.log('Wallet already registered with extension');
    return;
  }
  
  // Register the wallet
  try {
    const result = await window.DCWS.registerWallet(myWalletInfo);
    console.log('Successfully registered with extension!', result);
    
    // Optionally, show a notification to the user
    showNotification('This wallet has been added to your Digital Credentials extension!');
  } catch (error) {
    console.error('Failed to register:', error);
  }
})();
```

### Advanced Integration

For more control, you can add user-initiated registration:

```html
<!DOCTYPE html>
<html>
<head>
  <title>MyWallet</title>
</head>
<body>
  <button id="registerBtn" style="display:none;">
    Add to Browser Extension
  </button>
  
  <script>
    const walletInfo = {
      name: 'MyWallet',
      url: 'https://wallet.example.com',
      description: 'Secure digital credentials',
      logo: 'https://wallet.example.com/logo.png',
      color: '#2563eb'
    };
    
    // Show button only if extension is installed and wallet not registered
    (async function() {
      if (window.DCWS?.isInstalled()) {
        const isRegistered = await window.DCWS.isWalletRegistered(walletInfo.url);
        
        if (!isRegistered) {
          document.getElementById('registerBtn').style.display = 'block';
        }
      }
    })();
    
    // Handle registration button click
    document.getElementById('registerBtn').addEventListener('click', async function() {
      this.disabled = true;
      this.textContent = 'Registering...';
      
      try {
        const result = await window.DCWS.registerWallet(walletInfo);
        this.textContent = '✓ Added to Extension';
        this.style.backgroundColor = '#10b981';
        
        // Optionally hide after success
        setTimeout(() => {
          this.style.display = 'none';
        }, 2000);
      } catch (error) {
        this.textContent = 'Registration Failed';
        this.disabled = false;
        alert('Failed to register: ' + error.message);
      }
    });
  </script>
</body>
</html>
```

### wwWallet Integration Example

For wwWallet instances:

```javascript
// On wwWallet initialization
async function registerWithExtension() {
  if (!window.DCWS?.isInstalled()) {
    return;
  }
  
  const walletInfo = {
    name: 'wwWallet - ' + (CONFIG.instance_name || 'Default'),
    url: CONFIG.wallet_endpoint || window.location.origin,
    description: CONFIG.description || 'wwWallet digital identity wallet',
    icon: '🌐',
    color: CONFIG.brand_color || '#3b82f6'
  };
  
  try {
    // Check first to avoid unnecessary registration attempts
    const isRegistered = await window.DCWS.isWalletRegistered(walletInfo.url);
    
    if (!isRegistered) {
      const result = await window.DCWS.registerWallet(walletInfo);
      console.log('wwWallet registered with browser extension', result);
    }
  } catch (error) {
    console.warn('Could not register with extension:', error);
    // Non-critical error, continue wallet operation
  }
}

// Call during app initialization
registerWithExtension();
```

## User Experience Flow

1. **User visits wallet website** (e.g., https://wallet.example.com)
2. **Wallet detects extension** via `isInstalled()`
3. **Wallet checks registration** via `isWalletRegistered()`
4. **If not registered**, wallet calls `registerWallet()`
5. **Extension adds wallet** to user's configuration automatically
6. **User sees wallet** in extension popup and options page
7. **Next time user needs credentials**, wallet appears in selection modal

## Best Practices

### 1. Always Check for Extension First

```javascript
if (!window.DCWS?.isInstalled()) {
  // Extension not installed, skip registration
  return;
}
```

### 2. Check Before Registering

Avoid unnecessary registration attempts:

```javascript
const isRegistered = await window.DCWS.isWalletRegistered(url);
if (!isRegistered) {
  await window.DCWS.registerWallet(info);
}
```

### 3. Handle Errors Gracefully

Registration failures should not break your wallet:

```javascript
try {
  await window.DCWS.registerWallet(info);
} catch (error) {
  console.warn('Extension registration failed:', error);
  // Continue normal wallet operation
}
```

### 4. Use Appropriate Timing

**Good times to register:**
- On first page load (landing page)
- After user signs in
- During wallet initialization

**Avoid:**
- Registering on every page navigation
- Registering multiple times in quick succession

### 5. Provide User Feedback

If showing a registration button, give clear feedback:

```javascript
button.textContent = 'Registering...';
// ... register ...
button.textContent = '✓ Added to Extension';
```

## Security Considerations

### URL Validation

The extension validates that:
- URL is properly formatted
- URL is a valid `https://` endpoint (or `http://localhost` for development)

### Duplicate Prevention

- Wallets are identified by their URL
- If a wallet with the same URL exists, registration returns the existing wallet
- This prevents duplicates and registration spam

### Origin Tracking

The extension records:
- `registeredFrom`: The origin that initiated the registration
- `registeredAt`: Timestamp of registration
- `autoRegistered`: Flag indicating auto-registration

This helps users identify and manage auto-registered wallets.

### User Control

Users can always:
- View auto-registered wallets in the options page
- Disable or delete auto-registered wallets
- See which origin registered each wallet

## Metadata

Auto-registered wallets are marked with:

```javascript
{
  autoRegistered: true,           // Flag for auto-registration
  registeredFrom: "https://...",  // Origin that registered
  registeredAt: "2024-01-15T..."  // ISO timestamp
}
```

This appears in the wallet card as a badge: **Auto-Registered**

## API Versioning

Current API version: **1.0.0**

Access via:
```javascript
console.log(window.DCWS.version);  // "1.0.0"
```

## Browser Compatibility

The API works in all browsers where the extension is available:
- ✅ Chrome / Chromium
- ✅ Firefox
- ✅ Safari

The API is injected before page scripts run, ensuring availability.

## Troubleshooting

### Extension not detected

**Problem:** `window.DCWS` is `undefined`

**Solutions:**
- Ensure extension is installed and enabled
- Check that page uses `https://` (or `http://localhost` for dev)
- Wait for page load: wrap in `DOMContentLoaded` or async IIFE

### Registration timeout

**Problem:** `registerWallet()` throws "Registration timeout"

**Solutions:**
- Check browser console for errors
- Verify extension is not disabled
- Ensure no content script injection failures

### Wallet not appearing in modal

**Problem:** Registered but doesn't show in selection

**Solutions:**
- Check that wallet is enabled (not disabled in options)
- Verify extension itself is enabled
- Check wallet URL matches exactly

## Examples

### Simple Auto-Registration

```javascript
if (window.DCWS?.isInstalled()) {
  window.DCWS.registerWallet({
    name: 'MyWallet',
    url: 'https://wallet.example.com',
    icon: '🔐'
  }).catch(console.error);
}
```

### Conditional Button

```html
<button id="add-to-extension" style="display:none">
  Add to Browser Extension
</button>

<script>
  (async () => {
    if (window.DCWS?.isInstalled()) {
      const registered = await window.DCWS.isWalletRegistered(location.origin);
      if (!registered) {
        document.getElementById('add-to-extension').style.display = 'block';
      }
    }
  })();
</script>
```

### React Component

```jsx
import { useEffect, useState } from 'react';

function ExtensionRegistration() {
  const [canRegister, setCanRegister] = useState(false);
  const [status, setStatus] = useState('idle');
  
  useEffect(() => {
    async function checkExtension() {
      if (window.DCWS?.isInstalled()) {
        const isRegistered = await window.DCWS.isWalletRegistered(
          window.location.origin
        );
        setCanRegister(!isRegistered);
      }
    }
    checkExtension();
  }, []);
  
  const handleRegister = async () => {
    setStatus('registering');
    try {
      await window.DCWS.registerWallet({
        name: 'MyWallet',
        url: window.location.origin,
        description: 'My digital wallet',
        color: '#4f46e5'
      });
      setStatus('success');
      setCanRegister(false);
    } catch (error) {
      setStatus('error');
      console.error(error);
    }
  };
  
  if (!canRegister) return null;
  
  return (
    <button onClick={handleRegister} disabled={status === 'registering'}>
      {status === 'registering' ? 'Adding...' : 'Add to Extension'}
    </button>
  );
}
```

## Support

For issues or questions about the auto-registration API:
- Check the main [README.md](README.md)
- Review [WALLET_MANAGEMENT.md](WALLET_MANAGEMENT.md) for user documentation
- Report bugs via GitHub issues
