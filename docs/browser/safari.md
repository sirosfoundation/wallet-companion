# Safari Extension - Wallet Companion

This is the Safari version of the Wallet Companion extension.

## Installation

### Development Mode

Safari Web Extensions require Xcode for development. Follow these steps:

1. **Convert to Safari Web Extension (if needed):**
   ```bash
   xcrun safari-web-extension-converter dist/safari/ --app-name "Wallet Companion"
   ```

2. **Open in Xcode:**
   - Open the generated Xcode project
   - Build and run the project (Cmd+R)

3. **Enable in Safari:**
   - Open Safari Preferences → Extensions
   - Enable "Wallet Companion"
   - Grant necessary permissions

### Building for Distribution

1. Build the project in Xcode
2. Archive the application (Product → Archive)
3. Submit to App Store or distribute directly

## Safari-Specific Notes

- Safari uses Manifest V2 format
- Background scripts are non-persistent by default
- Some API differences exist compared to Chrome/Firefox
- The extension must be wrapped in a native app for distribution

## Files

- `manifest.json`: Extension configuration (Manifest V2)
- `background.js`: Background script (symlinked from src/)
- `content.js`: Content script (symlinked from src/)
- `popup.html`: Extension popup UI (symlinked from src/)
- `popup.js`: Popup logic (symlinked from src/)
- `icons/`: Extension icons

## Development Tips

- Use `browser` namespace instead of `chrome` for better compatibility
- Test thoroughly as Safari's WebExtension API support may differ
- Consider using `safari.extension` for Safari-specific features

## Resources

- [Safari Web Extensions Documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
- [Converting Web Extensions for Safari](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)
