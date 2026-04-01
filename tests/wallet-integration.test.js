/**
 * Mock Wallet Integration Tests
 * 
 * Tests wallet auto-registration and JWT verification using a mock wallet fixture.
 * Uses Puppeteer to load the mock wallet in a browser with the extension installed.
 */

import { launch } from 'puppeteer';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Mock Wallet Integration Tests', () => {
  let browser;
  let extensionId;
  const EXTENSION_PATH = join(__dirname, '..', 'chrome');
  const MOCK_WALLET_PATH = join(__dirname, 'fixtures', 'mock-wallet.html');

  beforeAll(async () => {
    // Check if extension is built
    if (!existsSync(EXTENSION_PATH)) {
      throw new Error('Extension not built. Run "npm run build:chrome" first.');
    }

    // Check if mock wallet fixture exists
    if (!existsSync(MOCK_WALLET_PATH)) {
      throw new Error('Mock wallet fixture not found at: ' + MOCK_WALLET_PATH);
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

    // Wait for extension to load
    const initialPage = await browser.newPage();
    await initialPage.goto('about:blank');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to find extension ID
    const targets = await browser.targets();
    const serviceWorker = targets.find(
      target => target.type() === 'service_worker' && target.url().includes('chrome-extension://')
    );
    
    if (serviceWorker) {
      const url = serviceWorker.url();
      extensionId = url.split('/')[2];
      console.log('✓ Extension loaded with ID:', extensionId);
    } else {
      console.log('✓ Extension loaded (ID detection skipped)');
    }

    await initialPage.close();
  }, 45000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Wallet Registration', () => {
    let page;

    beforeEach(async () => {
      page = await browser.newPage();
      
      // Disable auto-registration for manual testing
      await page.goto(`file://${MOCK_WALLET_PATH}?auto-register=false`);
      
      // Wait for mock wallet to initialize (it will wait for extension internally)
      await page.waitForFunction(
        () => typeof window.mockWallet !== 'undefined' && window.mockWallet.state.extensionInstalled !== undefined,
        { timeout: 5000 }
      );

      // Reset state (preserving extensionInstalled)
      await page.evaluate(() => window.mockWallet.reset());
    });

    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    test('should detect extension installation', async () => {
      // The mock wallet initializes automatically, just check the state
      const state = await page.evaluate(() => window.mockWallet.getState());
      
      // After reset(), extensionInstalled is preserved, so this should work
      expect(state.extensionInstalled).toBe(true);
    });

    test('should register wallet with default configuration', async () => {
      const result = await page.evaluate(async () => {
        return await window.mockWallet.register();
      });

      expect(result.success).toBe(true);
      expect(result.wallet).toBeDefined();
      expect(result.wallet.name).toBe('Mock Wallet');
      expect(result.wallet.url).toBe('https://mock-wallet.test.local');
      expect(result.wallet.protocols).toContain('openid4vp');
      expect(result.wallet.protocols).toContain('w3c-vc');
    }, 15000);

    test('should register wallet with custom configuration', async () => {
      const customConfig = {
        name: 'Custom Test Wallet',
        url: 'https://custom.test.local',
        protocols: ['openid4vp'],
        description: 'Custom wallet for testing',
        icon: '🔐',
        color: '#3b82f6'
      };

      const result = await page.evaluate(async (config) => {
        return await window.mockWallet.register(config);
      }, customConfig);

      expect(result.success).toBe(true);
      expect(result.wallet.name).toBe('Custom Test Wallet');
      expect(result.wallet.url).toBe('https://custom.test.local');
      expect(result.wallet.protocols).toEqual(['openid4vp']);
    }, 15000);

    test('should detect duplicate registration', async () => {
      // Register once
      await page.evaluate(async () => {
        return await window.mockWallet.register();
      });

      // Register again with same URL
      const result = await page.evaluate(async () => {
        return await window.mockWallet.register();
      });

      expect(result.success).toBe(true);
      expect(result.alreadyRegistered).toBe(true);
    }, 15000);

    test('should verify wallet is registered', async () => {
      // Register wallet
      await page.evaluate(async () => {
        return await window.mockWallet.register();
      });

      // Check if registered
      const isRegistered = await page.evaluate(async () => {
        return await window.mockWallet.isRegistered();
      });

      expect(isRegistered).toBe(true);
    }, 15000);

    test('should reject registration with invalid URL', async () => {
      const result = await page.evaluate(async () => {
        try {
          await window.mockWallet.simulateError('invalid_url');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid wallet URL');
    }, 15000);

    test('should reject registration without protocols', async () => {
      const result = await page.evaluate(async () => {
        try {
          await window.mockWallet.simulateError('missing_protocols');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one supported protocol');
    }, 15000);

    test('should reject registration with invalid protocol identifier', async () => {
      const result = await page.evaluate(async () => {
        try {
          await window.mockWallet.simulateError('invalid_protocol');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid protocol identifier');
    }, 15000);

    test('should track registration in call history', async () => {
      await page.evaluate(async () => {
        return await window.mockWallet.register();
      });

      const history = await page.evaluate(() => window.mockWallet.getCallHistory());

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('register');
      expect(history[0].data.response).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
    }, 15000);
  });

  describe('JWT Verification Callbacks', () => {
    let page;

    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(`file://${MOCK_WALLET_PATH}?auto-register=false`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.evaluate(() => window.mockWallet.reset());

      // Register wallet first
      await page.evaluate(async () => {
        return await window.mockWallet.register();
      });
    });

    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    test('should register JWT verifier', async () => {
      const success = await page.evaluate(async () => {
        return await window.mockWallet.registerVerifier();
      });

      expect(success).toBe(true);

      const state = await page.evaluate(() => window.mockWallet.getState());
      expect(state.verifierRegistered).toBe(true);
    }, 15000);

    test('should register custom JWT verifier callback', async () => {
      const success = await page.evaluate(async () => {
        // Custom verifier that always returns invalid
        const customVerifier = async (jwt, options) => {
          return {
            valid: false,
            error: 'Custom verifier: always invalid'
          };
        };

        return await window.mockWallet.registerVerifier(customVerifier);
      });

      expect(success).toBe(true);
    }, 15000);

    test('should unregister JWT verifier', async () => {
      // Register first
      await page.evaluate(async () => {
        return await window.mockWallet.registerVerifier();
      });

      // Unregister
      const removed = await page.evaluate(async () => {
        return await window.mockWallet.unregisterVerifier();
      });

      expect(removed).toBe(true);

      const state = await page.evaluate(() => window.mockWallet.getState());
      expect(state.verifierRegistered).toBe(false);
    }, 15000);

    test('should list registered JWT verifiers', async () => {
      // Register verifier
      await page.evaluate(async () => {
        return await window.mockWallet.registerVerifier();
      });

      // Get list
      const verifiers = await page.evaluate(() => {
        return window.mockWallet.getRegisteredVerifiers();
      });

      expect(verifiers).toContain('https://mock-wallet.test.local');
    }, 15000);

    test('should reject non-function as JWT verifier', async () => {
      const result = await page.evaluate(async () => {
        try {
          await window.mockWallet.simulateError('verifier_not_function');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be a function');
    }, 15000);

    test('should track verifier registration in call history', async () => {
      await page.evaluate(async () => {
        return await window.mockWallet.registerVerifier();
      });

      const history = await page.evaluate(() => window.mockWallet.getCallHistory());

      const verifierCalls = history.filter(h => h.action === 'registerVerifier');
      expect(verifierCalls.length).toBe(1);
      expect(verifierCalls[0].data.success).toBe(true);
    }, 15000);
  });

  describe('Multiple Mock Wallets', () => {
    let page1, page2;

    beforeEach(async () => {
      page1 = await browser.newPage();
      page2 = await browser.newPage();

      await page1.goto(`file://${MOCK_WALLET_PATH}?auto-register=false`);
      await page2.goto(`file://${MOCK_WALLET_PATH}?auto-register=false`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      await page1.evaluate(() => window.mockWallet.reset());
      await page2.evaluate(() => window.mockWallet.reset());
    });

    afterEach(async () => {
      if (page1) await page1.close();
      if (page2) await page2.close();
    });

    test('should register two different wallets', async () => {
      // Register wallet 1
      const result1 = await page1.evaluate(async () => {
        return await window.mockWallet.register({
          name: 'Wallet 1',
          url: 'https://wallet1.test.local',
          protocols: ['openid4vp']
        });
      });

      // Register wallet 2
      const result2 = await page2.evaluate(async () => {
        return await window.mockWallet.register({
          name: 'Wallet 2',
          url: 'https://wallet2.test.local',
          protocols: ['w3c-vc']
        });
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.wallet.url).not.toBe(result2.wallet.url);
    }, 20000);

    test('should register JWT verifiers for different wallets', async () => {
      // Register wallets
      await page1.evaluate(async () => {
        return await window.mockWallet.register({
          name: 'Wallet 1',
          url: 'https://wallet1.test.local',
          protocols: ['openid4vp']
        });
      });

      await page2.evaluate(async () => {
        return await window.mockWallet.register({
          name: 'Wallet 2',
          url: 'https://wallet2.test.local',
          protocols: ['openid4vp']
        });
      });

      // Register verifiers
      await page1.evaluate(async () => {
        return await window.mockWallet.registerVerifier();
      });

      await page2.evaluate(async () => {
        return await window.mockWallet.registerVerifier();
      });

      // Get verifiers from each page (JWT verifiers are per-page context)
      const verifiers1 = await page1.evaluate(() => {
        return window.mockWallet.getRegisteredVerifiers();
      });

      const verifiers2 = await page2.evaluate(() => {
        return window.mockWallet.getRegisteredVerifiers();
      });

      // Each page should see both verifiers since they share the same inject.js context
      // Actually, each page has its own inject.js context, so we need to verify
      // that each wallet can register its own verifier independently
      expect(verifiers1).toContain('https://wallet1.test.local');
      expect(verifiers2).toContain('https://wallet2.test.local');
      
      // Note: JWT verifiers are per-page (inject.js context), not shared across pages
      // This is expected behavior for the security model
    }, 20000);
  });

  describe('State Management', () => {
    let page;

    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(`file://${MOCK_WALLET_PATH}?auto-register=false`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.evaluate(() => window.mockWallet.reset());
    });

    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    test('should maintain state across operations', async () => {
      // Check initial state
      let state = await page.evaluate(() => window.mockWallet.getState());
      expect(state.registered).toBe(false);
      expect(state.verifierRegistered).toBe(false);

      // Register wallet
      await page.evaluate(async () => {
        return await window.mockWallet.register();
      });

      state = await page.evaluate(() => window.mockWallet.getState());
      expect(state.registered).toBe(true);
      expect(state.walletInfo).toBeDefined();

      // Register verifier
      await page.evaluate(async () => {
        return await window.mockWallet.registerVerifier();
      });

      state = await page.evaluate(() => window.mockWallet.getState());
      expect(state.registered).toBe(true);
      expect(state.verifierRegistered).toBe(true);
    }, 20000);

    test('should reset state correctly', async () => {
      // Perform operations
      await page.evaluate(async () => {
        await window.mockWallet.register();
        await window.mockWallet.registerVerifier();
      });

      // Reset
      await page.evaluate(() => window.mockWallet.reset());

      const state = await page.evaluate(() => window.mockWallet.getState());
      
      expect(state.registered).toBe(false);
      expect(state.walletInfo).toBeNull();
      expect(state.verifierRegistered).toBe(false);
      expect(state.callHistory).toEqual([]);
      expect(state.lastError).toBeNull();
    }, 20000);

    test('should capture errors in state', async () => {
      await page.evaluate(async () => {
        try {
          await window.mockWallet.simulateError('invalid_url');
        } catch (error) {
          // Expected
        }
      });

      const state = await page.evaluate(() => window.mockWallet.getState());
      expect(state.lastError).toBeDefined();
      expect(state.lastError).toContain('Invalid wallet URL');
    }, 15000);
  });
});
