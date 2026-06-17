/**
 * Wallet selection modal
 * Injected into pages when a Digital Credentials API call is intercepted.
 * Uses a closed Shadow DOM for full style isolation from the host page.
 */

import modalStyles from '@content/style/select-wallet.css?inline';
import type { ShowWalletSelectorOptions, WalletOption } from '@content/types';
import globalStyles from '@shared/style/global.css?inline';

const HOST_ID = 'dc-wallet-host';

// Static HTML templates — no user data, safe to use innerHTML via <template>
const MODAL_TEMPLATE = `
  <div class="wallet-selector">
    <div class="panel" role="dialog" aria-modal="true" aria-label="Select Digital Wallet">
      <div class="header">
        <h2>Select Digital Wallet</h2>
        <p>Choose which wallet to use for this credential request</p>
      </div>
      <div class="list"></div>
      <div class="footer">
        <button class="s-button -outline" data-action="native">Use Browser Wallet</button>
        <button class="s-button -outline" data-action="cancel">Cancel</button>
      </div>
    </div>
  </div>`;

const WALLET_ITEM_TEMPLATE = `
  <div class="wallet-item -selectable" role="button" tabindex="0">
    <div class="wallet-icon -large"></div>
    <div class="info">
      <div class="name"></div>
      <div class="desc"></div>
    </div>
  </div>`;

const EMPTY_STATE_TEMPLATE = `
  <div class="empty-state">
    <p>No wallets configured</p>
    <small>Use the extension settings to add wallet providers</small>
  </div>`;

function parseTemplate(html: string): DocumentFragment {
	const t = document.createElement('template');
	t.innerHTML = html;
	return t.content;
}

function createWalletItem(
	wallet: WalletOption,
	onSelect: (w: WalletOption) => void,
	dismiss: () => void,
): HTMLElement {
	const fragment = parseTemplate(WALLET_ITEM_TEMPLATE);
	const item = fragment.querySelector<HTMLElement>('.wallet-item');

	if (!item) {
		throw new Error('Failed to create wallet item: missing template elements');
	}

	const iconEl = item.querySelector('.wallet-icon');
	const nameEl = item.querySelector('.name');
	const descEl = item.querySelector('.desc');

	if (!iconEl || !nameEl || !descEl) {
		throw new Error('Failed to create wallet item: missing template elements');
	}

	const icon = document.createElement('img');
	icon.src = wallet.icon;
	icon.alt = `${wallet.name} icon`;

	iconEl.appendChild(icon);
	nameEl.textContent = wallet.name;
	descEl.textContent = wallet.description ?? wallet.url ?? 'Digital Identity Wallet';

	item.addEventListener('click', (e) => {
		e.stopPropagation();
		dismiss();
		onSelect(wallet);
	});

	return item;
}

export function selectWalletModal(options: ShowWalletSelectorOptions): void {
	const { wallets, onSelect, onNative, onCancel } = options;

	document.getElementById(HOST_ID)?.remove();

	const host = document.createElement('div');
	host.id = HOST_ID;
	const shadow = host.attachShadow({ mode: 'closed' });
	document.body.appendChild(host);

	const dismiss = () => host.remove();

	shadow.adoptedStyleSheets = [globalStyles, modalStyles].map((styles) => {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(styles);
		return sheet;
	});

	const fragment = parseTemplate(MODAL_TEMPLATE);
	const overlay = fragment.querySelector<HTMLElement>('.wallet-selector');
	const list = fragment.querySelector<HTMLElement>('.list');
	const nativeBtn = fragment.querySelector<HTMLElement>('[data-action="native"]');
	const cancelBtn = fragment.querySelector<HTMLElement>('[data-action="cancel"]');

	if (!overlay || !list || !nativeBtn || !cancelBtn) {
		throw new Error('Failed to create wallet selector: missing template elements');
	}

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) {
			dismiss();
			onCancel();
		}
	});
	nativeBtn.addEventListener('click', () => {
		dismiss();
		onNative();
	});
	cancelBtn.addEventListener('click', () => {
		dismiss();
		onCancel();
	});

	if (wallets.length > 0) {
		for (const wallet of wallets) {
			list.appendChild(createWalletItem(wallet, onSelect, dismiss));
		}
	} else {
		list.appendChild(parseTemplate(EMPTY_STATE_TEMPLATE));
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dismiss();
			onCancel();
			document.removeEventListener('keydown', handleEscape);
		}
	}
	document.addEventListener('keydown', handleEscape);

	shadow.append(fragment);
}
