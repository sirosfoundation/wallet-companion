/**
 * Browser API abstraction to support both multiple browsers.
 * Provides a unified interface for accessing the browser API, whether it's the WebExtension API (for Firefox) or the Chrome Extension API.
 */
export const browserApi = typeof browser !== 'undefined' ? browser : chrome;
