/**
 * Wallet selection modal
 * Injected into pages when a Digital Credentials API call is intercepted.
 * Uses a closed Shadow DOM for full style isolation from the host page.
 */

import modalStyles from '@content/style/select-wallet.css?inline';
import type { ShowWalletSelectorOptions, WalletOption } from '@content/types';
import { getMessage, getMessageGroup } from '@shared/i18n';
import globalStyles from '@shared/style/global.css?inline';

const HOST_ID = 'dc-wallet-host';

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

	const { modal, emptyState } = modalTemplate();
	const overlay = modal.querySelector<HTMLElement>('.wallet-selector');
	const list = modal.querySelector<HTMLElement>('.list');
	const nativeBtn = modal.querySelector<HTMLElement>('[data-action="native"]');
	const cancelBtn = modal.querySelector<HTMLElement>('[data-action="cancel"]');

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
		list.appendChild(emptyState);
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dismiss();
			onCancel();
			document.removeEventListener('keydown', handleEscape);
		}
	}
	document.addEventListener('keydown', handleEscape);

	shadow.append(modal);
}

function createWalletItem(
	wallet: WalletOption,
	onSelect: (w: WalletOption) => void,
	dismiss: () => void,
): HTMLElement {
	const { walletItem } = modalTemplate();
	const item = walletItem.querySelector<HTMLElement>('.wallet-item');

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
	icon.alt = getMessage('common_icon_alt', wallet.name);

	iconEl.appendChild(icon);
	nameEl.textContent = wallet.name;
	descEl.textContent = wallet.description ?? wallet.url ?? getMessage('common_wallet_description');

	item.addEventListener('click', (e) => {
		e.stopPropagation();
		dismiss();
		onSelect(wallet);
	});

	return item;
}

function modalTemplate() {
	const t = getMessageGroup('content_modals_select_wallet');

	const MODAL_TEMPLATE = `
	<div class="wallet-selector">
		<div class="panel" role="dialog" aria-modal="true" aria-label="${t('title')}">
		<div class="header">
			<h2>${t('title')}</h2>
			<p>${t('description')}</p>
		</div>
		<div class="list"></div>
		<div class="footer">
			<button class="s-button -outline" data-action="native">${t('use_browser')}</button>
			<button class="s-button -outline" data-action="cancel">${t('cancel')}</button>
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
		<p>${t('empty_title')}</p>
		<small>${t('empty_hint')}</small>
	</div>`;

	return {
		modal: parseTemplate(MODAL_TEMPLATE),
		walletItem: parseTemplate(WALLET_ITEM_TEMPLATE),
		emptyState: parseTemplate(EMPTY_STATE_TEMPLATE),
	}
}

function parseTemplate(html: string): DocumentFragment {
	const t = document.createElement('template');
	t.innerHTML = html;
	return t.content;
}
