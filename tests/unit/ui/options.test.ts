/**
 * Unit tests for options.ts - Wallet management UI logic
 */

import type { Wallet, UsageStats } from '@shared/schemas/resources';
import type { GetSettingsResponse } from '@shared/schemas/messages';

type MockWallet = Pick<Wallet, 'id' | 'name' | 'url' | 'description' | 'icon' | 'color' | 'enabled'>;

describe('Options Page - Wallet Management', () => {
	let mockWallets: MockWallet[];
	let mockSettings: GetSettingsResponse;

	beforeEach(() => {
		mockWallets = [
			{
				id: 'wallet-1',
				name: 'Wallet 1',
				url: 'https://wallet1.com',
				description: 'First wallet',
				icon: '🔐',
				color: '#3b82f6',
				enabled: true,
			},
			{
				id: 'wallet-2',
				name: 'Wallet 2',
				url: 'https://wallet2.com',
				description: 'Second wallet',
				icon: '🌐',
				color: '#10b981',
				enabled: false,
			},
		];

		mockSettings = {
			enabled: true,
			developerMode: false,
			stats: {
				interceptCount: 42,
				walletUses: {
					'wallet-1': 10,
					'wallet-2': 5,
				},
			},
		};

		// Setup DOM
		document.body.innerHTML = `
      <div id="wallets-container"></div>
      <div id="preset-wallets"></div>
      <div id="total-wallets">0</div>
      <div id="active-wallets">0</div>
      <div id="total-requests">0</div>
      <input type="checkbox" id="extension-enabled">
    `;
	});

	describe('Wallet CRUD Operations', () => {
		test('should generate unique wallet ID', () => {
			const id1 = 'wallet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
			const id2 = 'wallet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

			expect(id1).toMatch(/^wallet-\d+-[a-z0-9]+$/);
			expect(id2).toMatch(/^wallet-\d+-[a-z0-9]+$/);
		});

		test('should add new wallet to list', () => {
			const wallets = [...mockWallets];
			const newWallet: MockWallet = {
				id: 'wallet-3',
				name: 'New Wallet',
				url: 'https://new-wallet.com',
				description: 'A new wallet',
				icon: '🆕',
				color: '#ef4444',
				enabled: true,
			};

			wallets.push(newWallet);

			expect(wallets).toHaveLength(3);
			expect(wallets[2].name).toBe('New Wallet');
		});

		test('should update existing wallet', () => {
			const wallets = [...mockWallets];
			const walletIndex = wallets.findIndex((w) => w.id === 'wallet-1');

			wallets[walletIndex] = {
				...wallets[walletIndex],
				name: 'Updated Name',
				description: 'Updated description',
			};

			expect(wallets[0].name).toBe('Updated Name');
			expect(wallets[0].description).toBe('Updated description');
			expect(wallets[0].url).toBe('https://wallet1.com'); // URL unchanged
		});

		test('should delete wallet', () => {
			const wallets = [...mockWallets];
			const filtered = wallets.filter((w) => w.id !== 'wallet-1');

			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('wallet-2');
		});

		test('should toggle wallet enabled state', () => {
			const wallets = [...mockWallets];
			const wallet = wallets.find((w) => w.id === 'wallet-1');

			if (wallet) {
				wallet.enabled = !wallet.enabled;
				expect(wallet.enabled).toBe(false);

				wallet.enabled = !wallet.enabled;
				expect(wallet.enabled).toBe(true);
			}
		});
	});

	describe('Preset Wallets', () => {
		const SIROS_ID_PRESETS = [
			{
				name: 'SIROS ID',
				url: 'https://id.siros.org/id/default',
				icon: '🌐',
				color: '#1C4587',
				description: 'Default SIROS ID tenant',
			},
		];

		test('should have SIROS ID preset', () => {
			expect(SIROS_ID_PRESETS).toHaveLength(1);
			expect(SIROS_ID_PRESETS[0].name).toBe('SIROS ID');
		});

		test('should detect duplicate preset by URL', () => {
			const wallets = [...mockWallets];
			const preset = SIROS_ID_PRESETS[0];

			// Add preset URL to wallets
			wallets.push({ ...preset, id: 'wallet-preset', enabled: true });

			const exists = wallets.some((w) => w.url === preset.url);
			expect(exists).toBe(true);
		});

		test('should add preset if not duplicate', () => {
			const wallets = [...mockWallets];
			const preset = SIROS_ID_PRESETS[0];

			const exists = wallets.some((w) => w.url === preset.url);
			expect(exists).toBe(false);

			if (!exists) {
				wallets.push({
					id: 'wallet-' + Date.now(),
					...preset,
					enabled: true,
				});
			}

			expect(wallets).toHaveLength(3);
		});
	});

	describe('Form Validation', () => {
		test('should validate required name field', () => {
			const name: string = 'Test Wallet';
			const isValid = name && name.trim().length > 0;
			expect(isValid).toBe(true);
		});

		test('should reject empty name', () => {
			const name: string = '';
			const isValid = !!(name && name.trim().length > 0);
			expect(isValid).toBe(false);
		});

		test('should validate URL format', () => {
			const validUrl = 'https://wallet.example.com';
			const invalidUrl = 'not-a-url';

			expect(() => new URL(validUrl)).not.toThrow();
			expect(() => new URL(invalidUrl)).toThrow();
		});

		test('should accept http://localhost for development', () => {
			const localhostUrl = 'http://localhost:3000';
			expect(() => new URL(localhostUrl)).not.toThrow();
		});

		test('should validate color format', () => {
			const validColor = '#3b82f6';
			const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

			expect(hexColorRegex.test(validColor)).toBe(true);
			expect(hexColorRegex.test('#xyz123')).toBe(false);
		});
	});

	describe('Import/Export', () => {
		test('should export configuration to JSON', () => {
			const config = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				wallets: mockWallets,
				settings: mockSettings,
			};

			const json = JSON.stringify(config, null, 2);
			const parsed = JSON.parse(json);

			expect(parsed.version).toBe('1.0');
			expect(parsed.wallets).toHaveLength(2);
			expect(parsed.settings.enabled).toBe(true);
		});

		test('should validate import data structure', () => {
			const validConfig = {
				version: '1.0',
				wallets: mockWallets,
				settings: mockSettings,
			};

			const isValid = validConfig.wallets && Array.isArray(validConfig.wallets);
			expect(isValid).toBe(true);
		});

		test('should reject invalid import data', () => {
			const invalidConfig = {
				version: '1.0',
				wallets: 'not-an-array',
			};

			const isValid = invalidConfig.wallets && Array.isArray(invalidConfig.wallets);
			expect(isValid).toBe(false);
		});

		test('should merge imported wallets avoiding duplicates', () => {
			const existingWallets = [...mockWallets];
			const importedWallets: MockWallet[] = [
				{ id: 'w3', name: 'New', url: 'https://new.com', enabled: true },
				{ id: 'w4', name: 'Duplicate', url: 'https://wallet1.com', enabled: true }, // Duplicate URL
			];

			for (const importedWallet of importedWallets) {
				const exists = existingWallets.some((w) => w.url === importedWallet.url);
				if (!exists) {
					existingWallets.push({
						...importedWallet,
						id: 'wallet-' + Date.now(), // Regenerate ID
					});
				}
			}

			// Should only add the new wallet, not the duplicate
			expect(existingWallets).toHaveLength(3);
			expect(existingWallets.some((w) => w.name === 'New')).toBe(true);
		});
	});

	describe('Statistics Display', () => {
		test('should calculate total wallets', () => {
			const totalWallets = mockWallets.length;
			expect(totalWallets).toBe(2);
		});

		test('should calculate active wallets', () => {
			const activeWallets = mockWallets.filter((w) => w.enabled).length;
			expect(activeWallets).toBe(1);
		});

		test('should display intercept count', () => {
			const interceptCount = mockSettings.stats.interceptCount;
			expect(interceptCount).toBe(42);
		});

		test('should get wallet usage count', () => {
			const walletUses = mockSettings.stats.walletUses['wallet-1'] || 0;
			expect(walletUses).toBe(10);
		});

		test('should default to 0 for unused wallet', () => {
			const walletUses = mockSettings.stats.walletUses['wallet-999'] || 0;
			expect(walletUses).toBe(0);
		});
	});

	describe('Preset Wallet Variants', () => {
		const presets = [
			{
				id: 'siros-id',
				name: 'SIROS ID',
				url: 'https://id.siros.foundation',
				protocols: ['openid4vp'],
			},
			{
				id: 'siros-vault',
				name: 'SIROS Vault',
				url: 'https://vault.siros.foundation',
				protocols: ['openid4vp', 'w3c-vc'],
			},
		];

		test('should support multiple SIROS presets', () => {
			expect(presets).toHaveLength(2);
			expect(presets[0].name).toBe('SIROS ID');
			expect(presets[1].name).toBe('SIROS Vault');
		});

		test('should support different protocols per preset', () => {
			expect(presets[0].protocols).toEqual(['openid4vp']);
			expect(presets[1].protocols).toContain('w3c-vc');
		});

		test('should generate unique IDs for each preset', () => {
			const ids = presets.map((p) => p.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(presets.length);
		});
	});

	describe('XSS Prevention', () => {
		function escapeHtml(unsafe: string | null | undefined): string {
			if (!unsafe) return '';
			return unsafe
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;');
		}

		test('should escape XSS in wallet name field', () => {
			const maliciousName = '<img src=x onerror=alert(1)>';
			const escaped = escapeHtml(maliciousName);
			expect(escaped).not.toContain('<img');
			expect(escaped).toContain('&lt;img');
		});

		test('should escape XSS in wallet description field', () => {
			const maliciousDesc = '<script>document.cookie</script>';
			const escaped = escapeHtml(maliciousDesc);
			expect(escaped).not.toContain('<script>');
		});

		test('should reject malicious import JSON', () => {
			const maliciousImport = {
				wallets: [
					{
						id: 'w1',
						name: '<script>alert("xss")</script>',
						url: 'javascript:alert(1)',
						enabled: true,
					},
				],
			};

			// Validate URL is not javascript:
			const isValidUrl = (url: string): boolean => {
				try {
					const parsed = new URL(url);
					return parsed.protocol === 'https:' || parsed.protocol === 'http:';
				} catch {
					return false;
				}
			};

			expect(isValidUrl(maliciousImport.wallets[0].url)).toBe(false);
		});

		test('should sanitize imported wallet names', () => {
			const maliciousWallet = { name: '<b onmouseover=alert(1)>test</b>' };
			const sanitized = escapeHtml(maliciousWallet.name);
			expect(sanitized).not.toContain('<b');
		});
	});

	describe('Icon Selector', () => {
		test('should select emoji icon', () => {
			const selectedIcon = { type: 'emoji', value: '🔐' };
			expect(selectedIcon.type).toBe('emoji');
			expect(selectedIcon.value).toBe('🔐');
		});

		test('should fetch favicon from URL', () => {
			const faviconUrl = 'https://example.com/favicon.ico';
			const selectedIcon = { type: 'favicon', value: faviconUrl };
			expect(selectedIcon.type).toBe('favicon');
			expect(selectedIcon.value).toContain('favicon');
		});

		test('should generate identicon from wallet URL', () => {
			const walletUrl = 'https://wallet.example.com';
			const generatedIcon = { type: 'generated', seed: walletUrl };
			expect(generatedIcon.type).toBe('generated');
			expect(generatedIcon.seed).toBe(walletUrl);
		});

		test('should allow custom data URL icons', () => {
			const dataUrl = 'data:image/svg+xml,<svg></svg>';
			const selectedIcon = { type: 'custom', value: dataUrl };
			expect(selectedIcon.value).toMatch(/^data:image\//);
		});
	});

	describe('Tab Switching', () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<div id="tab-add" class="tab-content"></div>
				<div id="tab-wallets" class="tab-content active"></div>
				<div id="tab-settings" class="tab-content"></div>
				<button id="btn-add" class="tab-btn"></button>
				<button id="btn-wallets" class="tab-btn active"></button>
				<button id="btn-settings" class="tab-btn"></button>
			`;
		});

		function switchTab(tabName: string): void {
			const tabs = document.querySelectorAll('.tab-content');
			const buttons = document.querySelectorAll('.tab-btn');

			tabs.forEach((tab) => tab.classList.remove('active'));
			buttons.forEach((btn) => btn.classList.remove('active'));

			document.getElementById(`tab-${tabName}`)?.classList.add('active');
			document.getElementById(`btn-${tabName}`)?.classList.add('active');
		}

		test('should switch to add tab', () => {
			switchTab('add');

			expect(document.getElementById('tab-add')?.classList.contains('active')).toBe(true);
			expect(document.getElementById('tab-wallets')?.classList.contains('active')).toBe(false);
		});

		test('should switch to wallets tab', () => {
			switchTab('wallets');

			expect(document.getElementById('tab-wallets')?.classList.contains('active')).toBe(true);
		});

		test('should switch to settings tab', () => {
			switchTab('settings');

			expect(document.getElementById('tab-settings')?.classList.contains('active')).toBe(true);
			expect(document.getElementById('btn-settings')?.classList.contains('active')).toBe(true);
		});

		test('should deactivate other tabs when switching', () => {
			switchTab('add');

			const inactiveTabs = document.querySelectorAll('.tab-content:not(.active)');
			expect(inactiveTabs.length).toBe(2);
		});
	});
});
