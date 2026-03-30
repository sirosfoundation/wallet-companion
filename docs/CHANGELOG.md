# Changelog

All notable changes to the Web Wallet Selector browser extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Add actual DC API URL pattern configuration
- Implement custom request processing logic
- Add extension icons
- Add unit tests
- Add integration tests
- Performance optimizations

## [1.0.0] - 2025-11-18

### Added
- Initial project structure
- Cross-browser support (Chrome, Firefox, Safari)
- Shared source code architecture
- Content script for XHR/fetch interception
- Background script for webRequest API interception
- Extension popup UI with statistics
- Build system for all browsers
- Watch mode for development
- Comprehensive documentation
  - README.md - Main documentation
  - QUICKSTART.md - Quick start guide
  - DEVELOPMENT.md - Developer guide
  - PROJECT_SUMMARY.md - Project overview
- Chrome extension (Manifest V3)
- Firefox extension (Manifest V2)
- Safari extension (Manifest V2)
- ESLint configuration
- Package.json with build scripts
- License (MIT)

### Features
- Dual interception methods (content script + webRequest API)
- Request/response monitoring
- Statistics tracking
- Enable/disable toggle
- Cross-browser compatible codebase
- Automated build process

[Unreleased]: https://github.com/sirosfoundation/web-wallet-selector/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/sirosfoundation/web-wallet-selector/releases/tag/v1.0.0
