/**
 * Popup script for Wallet Companion extension
 */

import { getMessage, getMessageGroup } from '@shared/i18n';
import { runtime } from '@shared/runtime';
import { InboundMessages } from '@shared/schemas/messages';
import type { UsageStats, Wallets } from '@shared/schemas/resources';
import { translatePageUI } from './utils/i18n';
import { onMessage, sendMessage } from './utils/messaging';

document.addEventListener('DOMContentLoaded', () => {
	const statusBar = document.querySelector<HTMLElement>('#statusBar');
	const _statusIndicator = document.querySelector<HTMLElement>('#statusIndicator');
	const statusText = document.querySelector<HTMLElement>('#statusText');
	const extensionToggle = document.querySelector<HTMLInputElement>('#extensionToggle');
	const clearBtn = document.querySelector<HTMLButtonElement>('#clearBtn');
	const configureBtn = document.querySelector<HTMLButtonElement>('#configureBtn');
	const interceptCount = document.querySelector<HTMLElement>('#interceptCount');
	const walletCount = document.querySelector<HTMLElement>('#walletCount');
	const walletList = document.querySelector<HTMLElement>('#walletList');

	if (
		!statusBar ||
		!_statusIndicator ||
		!statusText ||
		!extensionToggle ||
		!clearBtn ||
		!configureBtn ||
		!interceptCount ||
		!walletCount ||
		!walletList
	) {
		console.error('One or more required DOM elements are missing');
		return;
	}

	translatePageUI('ui_popup');

	// Cross-browser compatibility
	const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

	// Load initial state
	loadState();

	// Toggle extension via header toggle switch
	extensionToggle.addEventListener('change', async (event) => {
		const newState = (event.target as HTMLInputElement).checked;

		await sendMessage({ type: InboundMessages.TOGGLE_ENABLED, enabled: newState });

		const response = await sendMessage({ type: InboundMessages.GET_SETTINGS });

		updateUI(newState, response.stats);
	});

	// Clear statistics
	clearBtn.addEventListener('click', async () => {
		await storage.local.set({ usage_stats: { interceptCount: 0, walletUses: {} } });
		interceptCount.textContent = '0';
		loadState(); // Reload to update wallet usage counts
	});

	// Configure wallets
	configureBtn.addEventListener('click', () => {
		// Open options page or show wallet configuration
		if (runtime.openOptionsPage) {
			runtime.openOptionsPage();
		} else {
			// Fallback: open in new tab
			window.open(runtime.getURL('options.html'));
		}
	});

	/**
	 * Load the current state from background script
	 */
	async function loadState() {
		try {
			const settings = await sendMessage({ type: InboundMessages.GET_SETTINGS });
			const wallets = await sendMessage({ type: InboundMessages.GET_WALLETS });

			updateUI(settings.enabled, settings.stats);
			displayWallets(wallets.wallets, settings.stats);
		} catch (error) {
			console.error('Failed to load state:', error);
		}
	}

	/**
	 * Update UI based on enabled state
	 */
	function updateUI(enabled: boolean, stats: UsageStats) {
		if (!statusBar || !statusText || !extensionToggle || !interceptCount) {
			console.error('One or more required DOM elements are missing');
			return;
		}

		extensionToggle.checked = enabled;

		if (enabled) {
			statusBar.classList.remove('-inactive');
			statusText.textContent = 'Active & monitoring';
		} else {
			statusBar.classList.add('-inactive');
			statusText.textContent = 'Inactive';
		}

		if (stats) {
			interceptCount.textContent = (stats.interceptCount || 0).toString();
		}
	}

	/**
	 * Display configured wallets
	 */
	function displayWallets(wallets: Wallets, stats: UsageStats) {
		if (!walletList || !walletCount) {
			console.error('One or more required DOM elements are missing');
			return;
		}

		if (!wallets || wallets.length === 0) {
			walletList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 13px;">
          ${getMessage('ui_popup_no_wallets')}<br>
          ${getMessage('ui_popup_no_wallets_hint')}
        </div>
      `;
			walletCount.textContent = '0';
			return;
		}

		const enabledWallets = wallets.filter((w) => w.enabled);
		walletCount.textContent = enabledWallets.length.toString();

		walletList.innerHTML = wallets
			.map((wallet) => {
				const _uses = stats?.walletUses?.[wallet.id] || 0;
				const statusClass = wallet.enabled ? '-active' : '-inactive';
				const statusLabel = wallet.enabled ? 'Active' : 'Inactive';

				const iconHtml = `<img src="${escapeHtml(wallet.icon)}" alt="${escapeHtml(wallet.name)}" style="width: 32px; height: 32px; object-fit: contain;">`;

				return `
        <div class="wallet-item">
          <div class="wallet-icon -small">${iconHtml}</div>
          <span class="name">${escapeHtml(wallet.name)}</span>
          <span class="status ${statusClass}">${statusLabel}</span>
        </div>
      `;
			})
			.join('');
	}

	/**
	 * Escape HTML to prevent XSS
	 */
	function escapeHtml(unsafe: string) {
		return unsafe
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Listen for updates from background script
	onMessage((message) => {
		if (message.type === 'STATS_UPDATE') {
			interceptCount.textContent = (message.stats.interceptCount || 0).toString();
			loadState(); // Reload to update wallet list with new usage stats
		}
	});
});
