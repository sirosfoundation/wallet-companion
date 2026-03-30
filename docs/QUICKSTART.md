# Quick Start Guide

## First Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   make install
   ```

2. **Build all extensions:**
   ```bash
   npm run build
   # or
   make build
   ```

3. **Check build status:**
   ```bash
   make status
   ```

## Loading the Extension

### Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `chrome/` folder
5. The extension icon should appear in your toolbar

### Firefox

**Option 1: Temporary Installation**
1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `firefox/` folder and select `manifest.json`

**Option 2: Using web-ext**
```bash
npm run dev:firefox
```
This will open Firefox with the extension automatically loaded.

### Safari

Safari requires additional setup:

1. **Convert to Safari Extension:**
   ```bash
   xcrun safari-web-extension-converter safari/ --app-name "Web Wallet Selector"
   ```

2. **Open in Xcode:**
   - Open the generated `.xcodeproj` file
   - Click "Run" (Cmd+R)

3. **Enable in Safari:**
   - Open Safari → Preferences
   - Go to Extensions tab
   - Enable "Web Wallet Selector"
   - Grant any requested permissions

## Customizing for Your DC API

You need to configure the extension to recognize your specific DC API endpoints:

### 1. Edit URL Patterns

In `src/background.js`, find the `isDCApiCall` function:

```javascript
function isDCApiCall(url) {
  const dcApiPatterns = [
    /dc\.api\.example\.com/,      // Replace with your domain
    /datacenter\.api\./,           // Add more patterns
    // Add your patterns here
  ];
  return dcApiPatterns.some(pattern => pattern.test(url));
}
```

### 2. Edit the same function in `src/content.js`:

```javascript
function isDCApiUrl(url) {
  if (!url) return false;
  
  const dcApiPatterns = [
    /dc\.api\.example\.com/,      // Replace with your domain
    /datacenter\.api\./,           // Add more patterns
    // Add your patterns here
  ];
  
  return dcApiPatterns.some(pattern => pattern.test(url));
}
```

### 3. Rebuild

After making changes:
```bash
npm run build
```

Then reload the extension in your browser.

## Testing the Extension

1. **Enable the Extension:**
   - Load it in your browser as described above

2. **Visit a Test Page:**
   - Go to a website that makes DC API calls
   - Or create a simple test HTML file with API calls

3. **Check Console Output:**
   - Open browser DevTools (F12)
   - Look for messages like "Intercepted DC API call: ..."

4. **Check Extension Popup:**
   - Click the extension icon
   - Verify status is "Active"
   - Check if intercept count increases

## Example Test Page

Create `test.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>DC API Test</title>
</head>
<body>
  <h1>DC API Extension Test</h1>
  <button onclick="testAPI()">Test DC API Call</button>
  
  <script>
    function testAPI() {
      // Replace with your actual DC API endpoint
      fetch('https://dc.api.example.com/data')
        .then(response => response.json())
        .then(data => console.log('Response:', data))
        .catch(err => console.error('Error:', err));
    }
  </script>
</body>
</html>
```

Open this file in your browser and click the button. Check the console for interception messages.

## Development Workflow

### Make Changes & Auto-Rebuild

Use watch mode for automatic rebuilds:

```bash
# Terminal 1 - Watch for changes
npm run watch:chrome

# Terminal 2 - Your code editor
# Edit files in src/
```

Every time you save a file in `src/`, the extension will be rebuilt automatically.

### Reload Extension

After changes are built, reload the extension:

- **Chrome:** Go to `chrome://extensions/` and click the reload icon
- **Firefox:** Click "Reload" in `about:debugging`
- **Safari:** Rebuild and run in Xcode

## Common Issues

### "Extension not working"
- Check browser console for errors
- Verify extension is enabled
- Check URL patterns match your API endpoints
- Reload the extension after changes

### "No API calls intercepted"
- Verify the URL patterns in `isDCApiCall()` functions
- Check permissions in manifest.json
- Ensure content script is injected (`run_at: document_start`)
- Look for errors in console

### "Build fails"
- Ensure Node.js is installed
- Run `npm install` first
- Check that `src/` directory has all required files

## Next Steps

1. **Customize DC API detection** - Update URL patterns
2. **Implement your logic** - Add functionality in `processRequest()`
3. **Test thoroughly** - Try different scenarios
4. **Add icons** - Create and add icon images
5. **Update metadata** - Edit manifest.json files with your info

## Getting Help

- Check `DEVELOPMENT.md` for detailed architecture info
- Review browser-specific READMEs in each folder
- Check browser extension documentation (links in main README)

## Quick Commands Reference

### Using Make

```bash
# Show all available commands
make help

# Build all browsers
make build

# Build specific browser
make build-chrome
make build-firefox
make build-safari

# Watch mode (auto-rebuild on changes)
make watch-chrome
make watch-firefox
make watch-safari

# Package for distribution
make package              # Chrome and Firefox
make package-chrome       # Chrome only
make package-firefox      # Firefox only

# Development helpers
make dev-firefox          # Run Firefox with extension
make status               # Check build status
make check-deps           # Verify dependencies
make clean                # Clean built files
make all                  # Clean, install, build, package
```

### Using npm

```bash
# Build all
npm run build

# Build specific browser
npm run build:chrome
npm run build:firefox
npm run build:safari

# Watch mode
npm run watch:chrome
npm run watch:firefox

# Package for distribution
npm run package:chrome
npm run package:firefox

# Clean built files
npm run clean

# Firefox development server
npm run dev:firefox
```
