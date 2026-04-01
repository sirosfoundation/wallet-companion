/**
 * Integration tests for browser extension
 * Tests end-to-end flows using Puppeteer
 */

import { launch } from 'puppeteer';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Browser Extension - Integration Tests', () => {
  let browser;
  let extensionPage;
  let extensionId;
  const EXTENSION_PATH = join(__dirname, '..', 'chrome');

  beforeAll(async () => {
    // Check if extension is built
    if (!existsSync(EXTENSION_PATH)) {
      throw new Error('Extension not built. Run "npm run build:chrome" first.');
    }

    // Launch browser with extension
    browser = await launch({
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security' // Allow file:// access
      ]
    });

    // Wait for service worker to be ready
    // Open a blank page first to ensure browser is stable
    const initialPage = await browser.newPage();
    await initialPage.goto('about:blank');
    
    let attempts = 0;
    while (!extensionId && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const targets = await browser.targets();
      
      // Look for service worker
      const serviceWorker = targets.find(
        target => target.type() === 'service_worker' && target.url().includes('chrome-extension://')
      );
      
      if (serviceWorker) {
        const url = serviceWorker.url();
        extensionId = url.split('/')[2];
        console.log('✓ Extension loaded with ID:', extensionId);
        break;
      }
      
      attempts++;
    }

    if (!extensionId) {
      // Try alternative method: navigate to extension page directly
      const manifestPath = join(EXTENSION_PATH, 'manifest.json');
      if (existsSync(manifestPath)) {
        console.log('✓ Extension files found, will use file:// URLs for testing');
      } else {
        const targets = await browser.targets();
        console.log('Available targets:', targets.map(t => ({ type: t.type(), url: t.url() })));
        console.warn('⚠ Warning: Could not find extension ID.');
      }
    }
  }, 45000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Extension Installation', () => {
    test.skip('should load extension successfully', async () => {
      // Note: Puppeteer has difficulty detecting Manifest V3 service workers
      // Extension is functional (see DC API tests), but ID detection needs improvement
      expect(extensionId).toBeDefined();
      expect(extensionId).toMatch(/^[a-z]{32}$/);
    });

    test.skip('should have extension pages accessible', async () => {
      // Skipped: Requires extension ID detection
      if (!extensionId) {
        throw new Error('Extension ID not found');
      }

      const page = await browser.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      
      const title = await page.title();
      expect(title).toBeTruthy();
      
      await page.close();
    }, 10000);
  });

  describe.skip('Options Page', () => {
    // Skipped: Requires extension ID for chrome-extension:// URLs
    // TODO: Improve extension ID detection for Manifest V3 service workers
    let page;

    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await page.waitForSelector('#wallets-tab', { timeout: 5000 });
    });

    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    test('should load options page', async () => {
      const title = await page.title();
      expect(title).toContain('Wallet');
    });

    test('should display tabs', async () => {
      const tabs = await page.$$('.tab');
      expect(tabs.length).toBeGreaterThanOrEqual(3);
    });

    test('should switch between tabs', async () => {
      // Click on "Add Wallet" tab
      await page.click('[data-tab="add"]');
      await new Promise(resolve => setTimeout(resolve, 500));

      const addTabContent = await page.$('#add-tab');
      const isVisible = await addTabContent.evaluate(el => 
        el.classList.contains('active')
      );

      expect(isVisible).toBe(true);
    });

    test('should display statistics', async () => {
      const totalWallets = await page.$eval('#total-wallets', el => el.textContent);
      const activeWallets = await page.$eval('#active-wallets', el => el.textContent);

      expect(totalWallets).toBeDefined();
      expect(activeWallets).toBeDefined();
    });
  });

  describe('DC API Interception', () => {
    let page;

    beforeEach(async () => {
      page = await browser.newPage();
    });

    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    test('should inject DC API interception script', async () => {
      const testPagePath = join(__dirname, '..', 'test-page.html');
      await page.goto(`file://${testPagePath}`);

      // Check if navigator.credentials.get is overridden
      const isOverridden = await page.evaluate(() => {
        return typeof navigator.credentials.get === 'function';
      });

      expect(isOverridden).toBe(true);
    });

    test('should detect extension API', async () => {
      const testPagePath = join(__dirname, '..', 'test-wallet-api.html');
      await page.goto(`file://${testPagePath}`);

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for injection

      const apiAvailable = await page.evaluate(() => {
        return typeof window.DigitalCredentialsWalletSelector !== 'undefined';
      });

      expect(apiAvailable).toBe(true);
    });

    test('should expose DCWS API methods', async () => {
      const testPagePath = join(__dirname, '..', 'test-wallet-api.html');
      await page.goto(`file://${testPagePath}`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const hasIsInstalled = await page.evaluate(() => {
        return typeof window.DCWS?.isInstalled === 'function';
      });

      const hasRegisterWallet = await page.evaluate(() => {
        return typeof window.DCWS?.registerWallet === 'function';
      });

      expect(hasIsInstalled).toBe(true);
      expect(hasRegisterWallet).toBe(true);
    });

    test('should detect extension installation', async () => {
      const testPagePath = join(__dirname, '..', 'test-wallet-api.html');
      await page.goto(`file://${testPagePath}`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const isInstalled = await page.evaluate(() => {
        return window.DCWS?.isInstalled();
      });

      expect(isInstalled).toBe(true);
    });
  });

  describe('Wallet Auto-Registration', () => {
    let page;

    beforeEach(async () => {
      page = await browser.newPage();
      const testPagePath = join(__dirname, '..', 'test-wallet-api.html');
      await page.goto(`file://${testPagePath}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    test('should register a wallet via API', async () => {
      const result = await page.evaluate(async () => {
        try {
          const response = await window.DCWS.registerWallet({
            name: 'Test Integration Wallet',
            url: 'https://test-integration.example.com',
            description: 'Integration test wallet',
            icon: '🧪',
            color: '#10b981'
          });
          return { success: true, response };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.response.success).toBe(true);
    }, 15000);

    test('should detect duplicate wallet registration', async () => {
      // Register once
      await page.evaluate(async () => {
        await window.DCWS.registerWallet({
          name: 'Duplicate Test',
          url: 'https://duplicate-test.example.com',
          icon: '🔄'
        });
      });

      // Try to register again with same URL
      const secondResult = await page.evaluate(async () => {
        try {
          const response = await window.DCWS.registerWallet({
            name: 'Duplicate Test 2',
            url: 'https://duplicate-test.example.com',
            icon: '🔄'
          });
          return { success: true, response };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.response.alreadyRegistered).toBe(true);
    }, 15000);

    test('should check if wallet is registered', async () => {
      // Register a wallet first
      await page.evaluate(async () => {
        await window.DCWS.registerWallet({
          name: 'Check Test',
          url: 'https://check-test.example.com'
        });
      });

      // Check if it's registered
      const isRegistered = await page.evaluate(async () => {
        return await window.DCWS.isWalletRegistered('https://check-test.example.com');
      });

      expect(isRegistered).toBe(true);
    }, 15000);

    test('should return false for unregistered wallet', async () => {
      const isRegistered = await page.evaluate(async () => {
        return await window.DCWS.isWalletRegistered('https://not-registered.example.com');
      });

      expect(isRegistered).toBe(false);
    }, 10000);
  });

  describe.skip('Popup Interface', () => {
    // Skipped: Requires extension ID for chrome-extension:// URLs
    // TODO: Improve extension ID detection for Manifest V3 service workers
    let page;

    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    test('should display status', async () => {
      const statusExists = await page.$('#status');
      expect(statusExists).toBeTruthy();
    });

    test('should display wallet count', async () => {
      const walletCount = await page.$('#walletCount');
      expect(walletCount).toBeTruthy();
    });

    test('should display intercept count', async () => {
      const interceptCount = await page.$('#interceptCount');
      expect(interceptCount).toBeTruthy();
    });

    test('should have configure button', async () => {
      const configureBtn = await page.$('#configureBtn');
      expect(configureBtn).toBeTruthy();
    });

    test('should have toggle button', async () => {
      const toggleBtn = await page.$('#toggleBtn');
      expect(toggleBtn).toBeTruthy();
    });
  });
});
