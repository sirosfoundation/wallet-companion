# Web Wallet Selector - Development Guide

## Architecture

The extension follows a modular architecture:

```
┌─────────────────┐
│   Web Page      │
└────────┬────────┘
         │
         ├─ XHR/Fetch calls intercepted by content.js
         │
┌────────▼────────┐
│  Content Script │ (content.js)
│  - Intercepts    │
│  - Monitors      │
└────────┬────────┘
         │
         │ Message passing
         │
┌────────▼────────┐
│ Background      │ (background.js)
│ - WebRequest    │
│ - Processing    │
│ - Storage       │
└────────┬────────┘
         │
┌────────▼────────┐
│  Popup UI       │ (popup.html/js)
│  - Status       │
│  - Controls     │
└─────────────────┘
```

## Key Components

### Content Script (`src/content.js`)
- Runs in web page context
- Intercepts XHR and fetch() calls
- Monitors for DC API patterns
- Communicates with background script

### Background Script (`src/background.js`)
- Service worker (Chrome) or persistent script (Firefox/Safari)
- Uses webRequest API for request interception
- Handles message passing
- Manages storage and state

### Popup (`src/popup.html` + `src/popup.js`)
- User interface for extension
- Shows statistics
- Toggle functionality
- Settings management

## API Interception Methods

### 1. Content Script Interception
Overrides `XMLHttpRequest` and `fetch` at the page level:

```javascript
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Custom logic here
  return originalFetch.apply(this, arguments);
};
```

**Pros:**
- Catches all requests from page context
- Can modify requests before they're sent
- No special permissions needed

**Cons:**
- Can be bypassed by advanced techniques
- Runs in isolated world (limited access to page variables)

### 2. WebRequest API Interception
Uses browser's `webRequest` API:

```javascript
chrome.webRequest.onBeforeRequest.addListener(
  handleRequest,
  { urls: ["<all_urls>"] },
  ["blocking", "requestBody"]
);
```

**Pros:**
- Cannot be bypassed by page scripts
- Full access to request/response
- More powerful modifications

**Cons:**
- Requires `webRequest` permission
- Manifest V3 limitations (Chrome)
- Performance impact if not careful

## Browser Differences

### Chrome (Manifest V3)
- Uses service workers instead of background pages
- Limited `webRequest` API (blocking removed for most cases)
- Uses `declarativeNetRequest` for many use cases
- Stricter CSP requirements

### Firefox (Manifest V2)
- Full `webRequest` API support
- Background pages/scripts
- Promise-based API (`browser.*`)
- Better developer tools

### Safari
- Manifest V2 compatible
- Requires native app wrapper
- Some API limitations
- `browser.*` namespace preferred

## Development Workflow

1. **Make changes** in `src/` directory
2. **Build** for target browser: `npm run build:chrome`
3. **Reload** extension in browser
4. **Test** functionality
5. **Debug** using browser DevTools

### Hot Reload Development

Use watch mode for automatic rebuilds:

```bash
npm run watch:chrome
# In another terminal
cd chrome && web-ext run  # For Firefox
```

## Testing Strategies

### Manual Testing
1. Create test pages with DC API calls
2. Monitor console output
3. Check Network tab in DevTools
4. Verify interception logs

### Automated Testing
Consider adding:
- Unit tests for utility functions
- Integration tests with test pages
- End-to-end tests with Selenium/Puppeteer

## Common Issues & Solutions

### Issue: Content script not injecting
**Solution:** Check `run_at` timing in manifest, ensure URL patterns match

### Issue: Background script not receiving messages
**Solution:** Verify runtime.onMessage listeners are set up, check for errors

### Issue: WebRequest not intercepting
**Solution:** Confirm permissions in manifest, check URL patterns, verify blocking mode

### Issue: CORS errors
**Solution:** This is by design - extensions cannot bypass CORS for security

## Performance Considerations

1. **Filter URL patterns carefully** - Don't intercept everything
2. **Minimize synchronous operations** - Use async/await
3. **Cache when possible** - Store frequently accessed data
4. **Debounce frequent calls** - Avoid processing duplicates
5. **Clean up listeners** - Remove unused event listeners

## Security Best Practices

1. **Validate all inputs** - Never trust data from web pages
2. **Use CSP headers** - Prevent XSS in extension pages
3. **Minimize permissions** - Only request what you need
4. **Sanitize displayed data** - Escape HTML in popup
5. **Regular updates** - Keep dependencies current

## Adding New Features

### Example: Add request caching

1. **Update background.js:**
```javascript
const cache = new Map();

function processRequest(details) {
  const cacheKey = details.url;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  // Process and cache...
}
```

2. **Update popup.html:**
Add cache statistics display

3. **Update manifest.json:**
Add storage permission if needed

4. **Build and test:**
```bash
npm run build
```

## Debugging Tips

### Chrome
- DevTools → Sources → Content scripts / Extension
- `chrome://extensions/` → Inspect views
- Console filtering: `chrome-extension://`

### Firefox
- `about:debugging` → This Firefox → Inspect
- Browser Console (Ctrl+Shift+J)
- Split console in DevTools

### Safari
- Develop menu → Show Extension Background Page
- Web Inspector → Sources → Extension Scripts
- Console filtering by extension

## Distribution Checklist

- [ ] Update version in all manifest.json files
- [ ] Update version in package.json
- [ ] Add/update icons (all sizes)
- [ ] Test on all target browsers
- [ ] Update README with any new features
- [ ] Create release notes
- [ ] Build production versions
- [ ] Test packaged extensions
- [ ] Submit to stores (if applicable)

## Resources

- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
