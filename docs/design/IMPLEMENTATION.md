# Wallet Companion - Implementation Summary

## Overview

This browser extension intercepts calls to the W3C Digital Credentials API (`navigator.credentials.get`) and provides users with a wallet selection interface, allowing them to choose between configured digital identity wallets or fallback to the browser's native implementation.

## Architecture

### Core Components

1. **inject.js** (Page Context)
   - Runs in the actual web page context
   - Overrides `navigator.credentials.get()`
   - Detects digital identity requests vs. regular credential requests
   - Communicates with content script via custom events
   - Manages pending requests and timeouts

2. **content.js** (Content Script Context)
   - Bridge between page and extension
   - Injects inject.js into the page
   - Listens for credential requests from page
   - Communicates with background script
   - Manages wallet selection modal

3. **modal.js** (Injected UI)
   - Creates and displays the wallet selection modal
   - Renders configured wallets in a user-friendly interface
   - Handles user interactions (wallet selection, cancel, use native)
   - Prevents XSS with HTML escaping

4. **background.js** (Service Worker/Background Script)
   - Manages wallet configuration storage
   - Handles messages from content scripts
   - Tracks usage statistics
   - Provides settings management
   - Initializes default wallet configuration

5. **popup.html/js** (Extension Popup)
   - Displays extension status and statistics
   - Shows configured wallets
   - Allows enabling/disabling the extension
   - Links to wallet configuration
   - Shows intercept counts and wallet usage

## How It Works

### Request Flow

```
1. Web page calls navigator.credentials.get({identity: ...})
   ↓
2. inject.js intercepts the call
   ↓
3. Checks if it's a digital identity request
   ↓ Yes                          ↓ No
4. Dispatches custom event    4. Passes to native API
   ↓
5. content.js receives event
   ↓
6. Requests wallets from background.js
   ↓
7. Injects modal.js if needed
   ↓
8. Shows wallet selection modal to user
   ↓
   User selects:
   ├─ Configured wallet → Return simulated credential
   ├─ Native browser → Pass to original API
   └─ Cancel → Reject with AbortError
```

### Digital Identity Detection

The extension identifies digital identity requests by checking for:
- `options.identity` property
- `options.digital` property  
- `options.mediation` set to "optional" or "required"

Regular credential requests (passwords, etc.) are passed through unchanged.

## Key Features

### 1. Wallet Configuration
- Pre-configured default wallets
- Stored in browser's local storage
- Each wallet has: id, name, URL, icon, color, description, enabled status
- Extensible for custom wallet providers

### 2. User Interface
- **Modal Dialog**: Clean, modern design using inline styles
- **Wallet Selection**: Visual cards for each wallet
- **Options**: Use native browser wallet or cancel
- **Accessibility**: Keyboard support (ESC to cancel)
- **Click-outside to close**: UX best practice

### 3. Extension Popup
- **Status Display**: Active/Disabled state
- **Statistics**: Request intercepts and wallet usage
- **Wallet List**: Shows configured wallets (up to 3 preview)
- **Controls**: Enable/disable, configure wallets, clear stats

### 4. Cross-Browser Compatibility
- **Chrome**: Manifest V3, service worker, web_accessible_resources
- **Firefox**: Manifest V2, background scripts, web_accessible_resources array
- **Safari**: Manifest V2 compatible format

### 5. Security Considerations
- HTML escaping in modal to prevent XSS
- Content Security Policy compatible
- Runs in isolated extension context
- Validates all user inputs

## File Structure

```
src/
├── inject.js          # Injected into page, overrides API
├── content.js         # Content script, manages injection
├── modal.js           # Wallet selection UI
├── background.js      # Extension background logic
├── popup.html         # Extension popup UI
└── popup.js           # Popup logic

[browser]/
├── manifest.json      # Browser-specific manifest
├── icons/             # Extension icons
└── [built files]      # Copied from src/
```

## Manifest Differences

### Chrome (V3)
```json
{
  "manifest_version": 3,
  "background": { "service_worker": "background.js" },
  "web_accessible_resources": [{
    "resources": ["inject.js", "modal.js"],
    "matches": ["<all_urls>"]
  }]
}
```

### Firefox/Safari (V2)
```json
{
  "manifest_version": 2,
  "background": { "scripts": ["background.js"] },
  "web_accessible_resources": ["inject.js", "modal.js"]
}
```

## Storage Schema

### Configured Wallets
```javascript
{
  "configured_wallets": [
    {
      "id": "wallet-1",
      "name": "Example Wallet",
      "url": "https://wallet.example.com",
      "icon": "🔐",
      "color": "#3b82f6",
      "description": "Example digital identity wallet",
      "enabled": true
    }
  ]
}
```

### Extension Settings
```javascript
{
  "extension_enabled": true,
  "usage_stats": {
    "interceptCount": 0,
    "walletUses": {
      "wallet-1": 0
    }
  }
}
```

## Message Passing Protocol

### Content Script → Background
```javascript
// Request wallet selector
{ type: 'SHOW_WALLET_SELECTOR', requestId, options, origin }

// Notify wallet selected
{ type: 'WALLET_SELECTED', walletId, requestId }

// Get wallets
{ type: 'GET_WALLETS' }

// Save wallets
{ type: 'SAVE_WALLETS', wallets }

// Get settings
{ type: 'GET_SETTINGS' }

// Toggle enabled
{ type: 'TOGGLE_ENABLED', enabled }
```

### Page ↔ Content Script (Custom Events)
```javascript
// Page → Content Script
'DC_CREDENTIALS_REQUEST' { requestId, options }

// Content Script → Page
'DC_CREDENTIALS_RESPONSE' { requestId, response, error, useNative }
```

## Testing

### Test Page Included
`test-page.html` provides three test scenarios:
1. Basic digital identity request
2. Request with specific claims
3. Regular credential request (not intercepted)

### Manual Testing Steps
1. Install extension in browser
2. Open test-page.html
3. Click "Request Digital Credential"
4. Verify modal appears with wallet options
5. Select wallet or native option
6. Check console for results

## Future Enhancements

### Planned Features
- [ ] Actual wallet communication (currently simulated)
- [ ] Options page for full wallet management
- [ ] Import/export wallet configurations
- [ ] Wallet-specific credential handling
- [ ] Support for multiple credential protocols
- [ ] Wallet reputation/trust indicators
- [ ] Recent wallets / favorites
- [ ] Per-site wallet preferences
- [ ] Encrypted wallet credentials
- [ ] Biometric authentication integration

### Potential Integrations
- OpenID4VP protocol support
- DIDComm messaging
- Verifiable Credentials Data Model
- Wallet Connect protocol
- Platform-specific wallet APIs

## Known Limitations

1. **Simulated Credentials**: Currently returns mock credential data
2. **No Options Page**: Wallet configuration requires code changes
3. **Chrome Manifest V3**: Service workers have limitations vs. persistent backgrounds
4. **Safari**: Requires Xcode and conversion to native app wrapper
5. **Wallet Communication**: Needs implementation of actual wallet protocols

## Development Guidelines

### Adding a New Wallet
1. Edit `src/background.js` → `DEFAULT_WALLETS`
2. Add wallet object with all required fields
3. Rebuild: `make build`
4. Reload extension in browser

### Customizing the Modal
Edit `src/modal.js` - all styles are inline for isolation

### Handling Actual Wallet Requests
Implement in content script after wallet selection:
```javascript
// Instead of simulated credential:
const credential = await communicateWithWallet(wallet, options);
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| API Interception | ✅ | ✅ | ✅ |
| Modal Display | ✅ | ✅ | ✅ |
| Wallet Storage | ✅ | ✅ | ✅ |
| Statistics | ✅ | ✅ | ✅ |
| Native Fallback | ✅ | ✅ | ✅ |

## Resources

- [W3C Digital Credentials API](https://wicg.github.io/digital-credentials/)
- [Credential Management API](https://www.w3.org/TR/credential-management-1/)
- [OpenID for Verifiable Presentations](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)

## License

MIT License - See LICENSE file for details
