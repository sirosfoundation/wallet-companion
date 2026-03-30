# Development Guide

Complete guide for building, testing, and developing the Web Wallet Selector extension.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Building](#building)
- [Testing](#testing)
- [Browser-Specific Development](#browser-specific-development)
- [Packaging for Distribution](#packaging-for-distribution)
- [Project Structure](#project-structure)
- [Debugging](#debugging)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Browser-specific requirements:
  - **Chrome**: Chrome browser with Developer mode enabled
  - **Firefox**: Firefox browser
  - **Safari**: macOS with Xcode (for Safari Web Extension conversion)

## Project Setup

1. Clone the repository:

   ```bash
   cd /home/leifj/work/siros.org/browser-extensions
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build for your target browser:

   ```bash
   # Build for all browsers
   npm run build

   # Or build for specific browser
   npm run build:chrome
   npm run build:firefox
   npm run build:safari
   ```

## Development Workflow

### Watch Mode (Recommended)

Use watch mode for automatic rebuilds during development:

```bash
# Watch all browsers
npm run watch

# Watch specific browser
npm run watch:chrome
npm run watch:firefox
npm run watch:safari
```

Watch mode will automatically rebuild when you save changes to source files.

### Manual Builds

```bash
# Build all
npm run build

# Build specific browser
npm run build:chrome
npm run build:firefox
npm run build:safari
```

## Building

### Using npm Scripts

```bash
# Build all extensions
npm run build

# Build specific browser
npm run build:chrome
npm run build:firefox
npm run build:safari
```

### Using Makefile

```bash
# Build all extensions
make build

# Build specific browser
make build-chrome
make build-firefox
make build-safari

# Clean build artifacts
make clean

# Build and package everything
make all
```

## Testing

### Interactive Test Pages

#### 1. Digital Credentials API Test

Test basic DC API interception and wallet selection:

```bash
# Open the test page
open test-page.html  # macOS
xdg-open test-page.html  # Linux
start test-page.html  # Windows
```

**Features tested:**
- Basic digital identity credential requests
- Requests with specific claims
- Protocol-specific requests (OpenID4VP)
- Difference between digital identity and regular credential requests

#### 2. Wallet Auto-Registration Test

Test the wallet registration API:

```bash
open test-wallet-api.html  # macOS
xdg-open test-wallet-api.html  # Linux
start test-wallet-api.html  # Windows
```

**Features tested:**
- Extension detection (`DCWS.isInstalled()`)
- Wallet registration with protocols
- JWT verifier registration
- API error handling

### Unit Tests

Run the complete test suite:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- tests/openid4vp.test.js       # 36 OpenID4VP tests
npm test -- tests/jwt-verification.test.js # 21 JWT callback tests

# Run with coverage
npm run test:coverage

# Run unit tests only (no integration)
npm run test:unit

# Watch mode for tests
npm run test:watch
```

### Test Coverage

Current test coverage:
- ✅ 332 tests passing (9 test suites)
- ✅ OpenID4VP: Request parsing, JAR handling, response validation (36 tests)
- ✅ JWT Verification: Registration, callback execution, integration (21 tests)
- ✅ Protocol plugins: Registration, filtering, request processing (20 tests)
- ✅ Inject script: DC API interception, URL building (61 tests)
- ✅ Options page: Wallet management, presets, settings (59 tests)
- ✅ Popup: UI state, wallet display (33 tests)
- ✅ Modal: Wallet selector UI (45 tests)
- ✅ Content script: Message bridge (44 tests)
- ✅ Background: Storage, settings (13 tests)

### Integration Tests

Integration tests use Puppeteer to test the extension in a real browser:

```bash
npm run test:integration
```

## Browser-Specific Development

### Chrome

1. Build the extension:

   ```bash
   npm run build:chrome
   # or
   npm run watch:chrome
   ```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome` directory

3. Reload after changes:
   - Click the reload icon on the extension card
   - Or use `Ctrl+R` when focused on `chrome://extensions/`

4. View logs:
   - Click "Inspect views: background page" for service worker logs
   - Use browser DevTools console for content script logs

### Firefox

1. Build the extension:

   ```bash
   npm run build:firefox
   # or
   npm run watch:firefox
   ```

2. Load in Firefox:
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from the `firefox` directory

3. Or use web-ext for development:

   ```bash
   npm run dev:firefox
   ```

   This will:
   - Build the extension
   - Launch Firefox with the extension loaded
   - Auto-reload on changes

4. View logs:
   - Click "Inspect" button in `about:debugging`
   - Use browser console for logs

### Safari

1. Build the extension:

   ```bash
   npm run build:safari
   # or
   npm run watch:safari
   ```

2. Convert to Safari Web Extension (first time only):

   ```bash
   xcrun safari-web-extension-converter safari/ --app-name "Web Wallet Selector"
   ```

3. Open the generated Xcode project and run it

4. Enable in Safari:
   - Safari → Preferences → Extensions
   - Enable "Web Wallet Selector"

5. View logs:
   - Develop menu → Show Extension Background Page

## Packaging for Distribution

### Chrome Web Store

```bash
# Using Make
make package-chrome

# Using npm
npm run package:chrome
```

Creates `dist/chrome-extension.zip` ready for Chrome Web Store submission.

**Submission checklist:**
- [ ] Update version in `manifest.json`
- [ ] Test in Chrome
- [ ] Run all tests
- [ ] Create package
- [ ] Upload to Chrome Web Store Developer Dashboard
- [ ] Fill in store listing details

### Firefox Add-ons

```bash
# Using Make
make package-firefox

# Using npm
npm run package:firefox
```

Creates `dist/firefox-extension.xpi` ready for Firefox Add-ons submission.

**Submission checklist:**
- [ ] Update version in `manifest.json`
- [ ] Test in Firefox
- [ ] Run all tests
- [ ] Create package
- [ ] Upload to addons.mozilla.org
- [ ] Fill in add-on details

### Safari App Store

Use Xcode to archive and export the app:

1. Open the Xcode project
2. Product → Archive
3. Distribute App → Mac App Store
4. Follow App Store submission workflow

## Project Structure

```
browser-extensions/
├── src/                    # Shared source code
│   ├── background.js       # Background script (service worker)
│   ├── content.js          # Content script (bridge)
│   ├── inject.js           # Page context (DC API interception)
│   ├── protocols/          # Protocol plugins
│   │   └── OpenID4VPPlugin.js  # OpenID4VP implementation
│   ├── protocols.js        # Protocol plugin system
│   ├── modal.js            # Wallet selection modal UI
│   ├── popup.html/js       # Extension popup and stats
│   ├── options.html/js     # Wallet management options page
│   └── icons/              # Source icons and logos (SVG)
├── chrome/                 # Chrome extension (built)
├── firefox/                # Firefox extension (built)
├── safari/                 # Safari extension (built)
├── scripts/                # Build and development scripts
│   ├── build.js            # Build automation
│   ├── watch.js            # Development watch mode
│   └── generate-icons.js   # Icon generation from SVG
├── tests/                  # Test suites
│   ├── *.test.js           # Unit tests (Jest)
│   ├── openid4vp.test.js   # OpenID4VP protocol tests
│   ├── jwt-verification.test.js  # JWT callback tests
│   └── integration.test.js # Integration tests (Puppeteer)
├── docs/                   # Documentation
│   ├── design/             # Design documents
│   │   ├── OPENID4VP_IMPLEMENTATION.md
│   │   ├── JWT_VERIFICATION_CALLBACKS.md
│   │   ├── PROTOCOL_SUPPORT.md
│   │   └── AUTO_REGISTRATION_SUMMARY.md
│   ├── BRANDING.md         # Brand guidelines
│   └── BRANDING_UPDATE.md  # Branding changelog
├── test-page.html          # DC API test page
├── test-wallet-api.html    # Wallet registration test
├── Makefile                # Build automation
├── package.json            # Dependencies and scripts
├── README.md               # This file
├── QUICKSTART.md           # Quick start guide
├── API_REFERENCE.md        # Complete API reference
├── DEVELOPMENT.md          # This file
└── WALLET_MANAGEMENT.md    # Wallet management guide
```

### Key Files

- **`src/inject.js`** - Injected into page context, intercepts `navigator.credentials.get()`, exposes `window.DCWS` API
- **`src/content.js`** - Content script, bridges inject script and background script
- **`src/background.js`** - Service worker (Chrome) / background script (Firefox/Safari), manages wallets and state
- **`src/protocols.js`** - Protocol plugin registry and base classes
- **`src/protocols/OpenID4VPPlugin.js`** - Complete OpenID4VP protocol implementation
- **`src/modal.js`** - Wallet selection modal UI
- **`src/options.js`** - Wallet management options page
- **`manifest.json`** - Browser extension manifest (browser-specific)

## Debugging

### Chrome

1. **Background Script (Service Worker)**:
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "Inspect views: background page"

2. **Content Script**:
   - Open DevTools on any page
   - Look for content script logs in the console

3. **Inject Script**:
   - Open DevTools
   - Logs from inject.js appear in the page console

4. **Common Issues**:
   - Manifest errors: Check syntax in `chrome/manifest.json`
   - API not intercepted: Check URL patterns in `inject.js`
   - Modal not showing: Check console for errors

### Firefox

1. **Background Script**:
   - Go to `about:debugging#/runtime/this-firefox`
   - Find your extension
   - Click "Inspect"

2. **Content Script**:
   - Open DevTools (F12)
   - Check console for content script logs

3. **Debugging with web-ext**:
   ```bash
   npm run dev:firefox
   ```
   Auto-reloads on file changes

4. **Common Issues**:
   - Manifest v2 compatibility: Firefox uses different manifest format
   - Background page vs service worker: Firefox uses persistent background pages

### Safari

1. **Background Page**:
   - Develop → Show Extension Background Page

2. **Content Script**:
   - Enable Develop menu
   - Inspect page
   - Check console

3. **Common Issues**:
   - Extension not appearing: Check Safari Preferences → Extensions
   - Code signing: Safari requires proper code signing for distribution

### General Debugging Tips

1. **Check Extension is Loaded**:
   ```javascript
   // On any page, in console:
   window.DCWS?.isInstalled()  // Should return true
   ```

2. **Test DC API Interception**:
   - Open `test-page.html`
   - Click "Request Digital Identity Credential"
   - Modal should appear

3. **Check Wallet Registration**:
   - Open extension options page
   - Should see configured wallets

4. **View Logs**:
   - Enable verbose logging in `background.js`
   - Check all three contexts: background, content, inject

5. **Reset Extension State**:
   ```javascript
   // In background script console:
   chrome.storage.local.clear();  // Chrome
   browser.storage.local.clear(); // Firefox/Safari
   ```

## Configuration

### Update URL Patterns

Edit `src/inject.js` to customize which URLs trigger DC API interception:

```javascript
function isDCApiCall(options) {
  // Customize this logic based on your needs
  return options?.digital !== undefined;
}
```

### Customize Default Wallets

Edit `src/background.js`:

```javascript
const DEFAULT_WALLETS = [
  {
    id: 'my-wallet',
    name: 'My Digital Wallet',
    url: 'https://wallet.example.com',
    protocols: ['openid4vp'],
    icon: '🔐',
    color: '#3b82f6',
    description: 'My preferred digital identity wallet',
    enabled: true
  }
];
```

### Update Extension Metadata

Each browser has its own manifest:
- `chrome/manifest.json` - Chrome (Manifest V3)
- `firefox/manifest.json` - Firefox (Manifest V2)
- `safari/manifest.json` - Safari (Manifest V2)

Update version, name, description, icons, and permissions as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Build all browsers: `npm run build`
6. Submit a pull request

### Code Style

- Use consistent indentation (2 spaces)
- Add JSDoc comments for public APIs
- Write tests for new features
- Follow existing code patterns

## Troubleshooting

### Extension not loading
- Ensure all files are built: `npm run build`
- Check browser console for errors
- Verify `manifest.json` syntax

### API calls not intercepted
- Check URL patterns in `isDCApiCall()` function
- Verify permissions in `manifest.json`
- Check content script injection timing

### Changes not reflected
- Reload the extension in browser
- Use watch mode for automatic rebuilds: `npm run watch:chrome`
- Clear browser cache if needed

### Tests failing
- Ensure dependencies are installed: `npm install`
- Check Node.js version (v14+)
- Run tests individually to isolate issues

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
- [W3C Digital Credentials API](https://w3c.github.io/digital-credentials/)
- [OpenID4VP Specification](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
