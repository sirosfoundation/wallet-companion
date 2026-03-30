# Chrome Extension - Web Wallet Selector

This is the Chrome version of the Web Wallet Selector extension.

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked"
4. Select the `chrome` directory from this project

### Building for Production

Run the build script from the root directory:
```bash
npm run build:chrome
```

## Features

- Intercepts DC API calls made from web pages
- Provides additional functionality beyond native browser capabilities
- Cross-browser compatible codebase

## Permissions

- `storage`: Store extension settings and statistics
- `webRequest`: Intercept network requests
- `activeTab`: Access the active tab for content script injection
- `host_permissions`: Access all URLs for API interception

## Files

- `manifest.json`: Extension configuration (Manifest V3)
- `background.js`: Service worker for background processing
- `content.js`: Content script injected into web pages
- `popup.html`: Extension popup UI
- `popup.js`: Popup logic
- `icons/`: Extension icons (add your own)

## Development

The extension shares core functionality with Safari and Firefox versions. The source files are symlinked or copied from the `src/` directory during the build process.
