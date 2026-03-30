# Wallet Management Guide

## Overview

The Web Wallet Selector extension allows users to configure multiple web-based digital identity wallets. This guide explains how to manage wallets and integrate with wwWallet and other providers.

## Accessing Wallet Configuration

### Method 1: Extension Popup
1. Click the extension icon in your browser toolbar
2. Click the "Configure Wallets" button
3. The options page will open in a new tab

### Method 2: Browser Settings
- **Chrome**: Right-click extension icon → Options
- **Firefox**: Right-click extension icon → Manage Extension → Options
- **Safari**: Safari → Preferences → Extensions → Web Wallet Selector → Options

## Options Page Structure

The options page is organized into three tabs:

### 1. My Wallets Tab
- View all configured wallets in a grid layout
- Each wallet card shows:
  - Wallet icon and name
  - URL endpoint
  - Description
  - Status badges (Active/Disabled, Default, wwWallet, Usage count)
- Actions per wallet:
  - **Edit**: Modify wallet details
  - **Enable/Disable**: Toggle wallet availability
  - **Delete**: Remove wallet from configuration

### 2. Add Wallet Tab

#### Quick Add with wwWallet Presets
Three pre-configured wwWallet instances are available:

1. **wwWallet Demo** (`https://demo.wwwallet.org`)
   - Official demonstration instance
   - Best for testing and exploring features

2. **wwWallet EU** (`https://wallet.europa.eu`)
   - European Union official wallet instance
   - For production use with EU digital credentials

3. **wwWallet Test** (`https://test.wwwallet.org`)
   - Testing environment
   - For development and integration testing

Simply click a preset card to add it instantly.

#### Custom Wallet Configuration
Add any web-based digital identity wallet by providing:

- **Name** (required): Display name for the wallet
- **URL** (required): Wallet endpoint (must be valid HTTPS URL)
- **Description** (optional): Brief description of the wallet's purpose
- **Icon** (optional): Emoji or single character (default: 🔐)
- **Color** (optional): Brand color for the wallet card
- **Enabled**: Whether the wallet is active (default: checked)

**Example Custom Wallet:**
```
Name: My Organization Wallet
URL: https://wallet.myorg.com
Description: Internal corporate digital identity wallet
Icon: 🏢
Color: #2563eb
Enabled: ✓
```

### 3. Settings Tab

#### Extension Status
- **Enable/Disable Extension**: Master switch for the entire extension
- When disabled, all DC API calls pass through to the native browser implementation

#### Statistics
- **Total Wallets**: Number of configured wallets
- **Active Wallets**: Number of enabled wallets
- **Total Requests**: Number of intercepted DC API calls
- **Clear Statistics**: Reset all usage counters

#### Configuration Management

**Export Configuration:**
- Downloads a JSON file with all wallet configurations and settings
- Filename format: `wallet-config-{timestamp}.json`
- Useful for:
  - Backing up your configuration
  - Sharing wallets across devices
  - Team distribution of approved wallets

**Import Configuration:**
- Upload a previously exported JSON file
- Merges with existing wallets (avoids duplicates by URL)
- Shows confirmation before importing

## Wallet Priority

The **first wallet** in your list becomes the **default wallet**:
- It's marked with a "Default" badge
- It appears first in the wallet selection modal
- To change the default, you must edit the storage directly (future feature)

## Best Practices

### For Individual Users
1. Start with wwWallet presets for easy setup
2. Add custom wallets as needed for specific services
3. Disable wallets you rarely use instead of deleting them
4. Export your configuration regularly as backup

### For Organizations
1. Create a standardized configuration JSON file
2. Pre-configure approved wallets with correct branding
3. Distribute the JSON file to team members for import
4. Include internal wallet documentation in descriptions

### For Developers
1. Use wwWallet Test for development
2. Add localhost wallets for local testing
3. Monitor statistics to track usage patterns
4. Export/import for quick environment switching

## wwWallet Integration

### What is wwWallet?
wwWallet is an open-source web-based digital identity wallet project. It implements the W3C Digital Credentials API and provides a user-friendly interface for managing verifiable credentials.

**Project**: https://github.com/wwWallet

### Supported wwWallet Features
- ✅ Digital Credentials API (navigator.credentials.get)
- ✅ Verifiable Credentials presentation
- ✅ OAuth 2.0 / OpenID4VP authorization flows
- ✅ Multiple credential formats (JWT, JSON-LD)

### Custom wwWallet Instance Setup

If you're running your own wwWallet instance:

1. Go to "Add Wallet" tab
2. Fill in the custom wallet form:
   ```
   Name: My wwWallet Instance
   URL: https://wallet.example.com
   Description: Custom wwWallet deployment
   Icon: 🌐
   Color: #3b82f6
   Enabled: ✓
   ```
3. Click "Add Wallet"
4. Optionally mark it as a preset by checking "This is a wwWallet instance" (future feature)

### Required wwWallet Configuration

For your wwWallet instance to work with this extension, ensure:

1. **HTTPS is enabled** - Extension requires secure connections
2. **CORS headers are configured** - Allow cross-origin requests from relying parties
3. **DC API endpoints are exposed** - `/api/credentials/get` or similar
4. **Proper error handling** - Return standardized error responses

## Import/Export Format

### Export File Structure
```json
{
  "version": "1.0",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "wallets": [
    {
      "id": "wallet-1234567890-abc123",
      "name": "wwWallet Demo",
      "url": "https://demo.wwwallet.org",
      "description": "Official wwWallet demonstration instance",
      "icon": "🌐",
      "color": "#3b82f6",
      "enabled": true,
      "preset": true
    }
  ],
  "settings": {
    "enabled": true,
    "stats": {
      "interceptCount": 42,
      "walletUses": {
        "wallet-1234567890-abc123": 15
      }
    }
  }
}
```

### Manual Configuration

Advanced users can edit the JSON to:
- Reorder wallets (first becomes default)
- Bulk-add multiple wallets
- Modify wallet properties
- Reset statistics

## Troubleshooting

### Wallet Not Appearing in Selection Modal
1. Check that the wallet is **enabled** in My Wallets tab
2. Verify the URL is correct and accessible
3. Ensure the extension itself is enabled

### Import Fails
- Verify JSON file is valid (use JSONLint or similar)
- Check that wallet objects have required fields (`name`, `url`)
- Ensure URLs are valid HTTPS endpoints

### Statistics Not Updating
- Statistics update in real-time
- If popup is open during a request, it should refresh automatically
- Try closing and reopening the popup
- Check browser console for errors

### Cannot Access Options Page
- Try right-clicking the extension icon → Options
- Or manually navigate to `chrome-extension://{extension-id}/options.html`
- Ensure the extension is properly installed and enabled

## Security Considerations

### Data Storage
- All wallet configurations are stored locally in browser storage
- No data is sent to external servers
- Configuration is specific to each browser profile

### URL Validation
- Only HTTPS URLs are accepted (except localhost for development)
- URLs are validated before saving
- Malformed URLs are rejected

### XSS Protection
- All user input is HTML-escaped before rendering
- Icon field only accepts single emoji/character
- No script execution in wallet descriptions

### Privacy
- Extension only intercepts DC API calls
- No tracking or analytics
- Usage statistics stored locally only
- Export files contain only configuration data

## Future Enhancements

Planned features for wallet management:

- [ ] Drag-and-drop to reorder wallets (set default)
- [ ] Wallet groups/categories
- [ ] Per-wallet permissions and trust levels
- [ ] Automatic wallet discovery from metadata
- [ ] Wallet health check/connectivity test
- [ ] Shared wallet collections (community presets)
- [ ] Password-protected export files
- [ ] Sync configuration across devices
- [ ] Advanced filtering and search
- [ ] Wallet usage analytics dashboard

## Support

For issues or questions:
- Check the main [README.md](README.md)
- Review [IMPLEMENTATION.md](IMPLEMENTATION.md) for technical details
- Report bugs via GitHub issues
- Contribute improvements via pull requests
