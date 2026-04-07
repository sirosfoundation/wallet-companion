/**
 * Wallet selection modal
 * Injected into pages when a Digital Credentials API call is intercepted.
 * Uses a closed Shadow DOM for full style isolation from the host page.
 */

import type { ShowWalletSelectorOptions, Wallet } from './types';

import globalStyles from '../shared/style/global.css?inline';
import modalStyles from './style/modal.css?inline';

const HOST_ID = 'dc-wallet-host';

const STYLES = [globalStyles, modalStyles].join('\n');

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

function createWalletIcon(icon: string | undefined): Node {
    if (!icon) return document.createTextNode('🔐');

    if (icon.startsWith('<svg')) {
        const svg = new DOMParser()
            .parseFromString(icon, 'image/svg+xml')
            .querySelector('svg');
        if (!svg) return document.createTextNode('🔐');
        // Load via <img> — browser sandboxes scripts in SVG loaded this way
        icon = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    }

    if (icon.startsWith('data:image/') || icon.startsWith('https://')) {
        const img = document.createElement('img');
        img.src = icon;
        img.alt = 'Wallet icon';
        return img;
    }

    // Emoji or plain text
    return document.createTextNode(icon);
}

function createWalletItem(
    wallet: Wallet,
    onSelect: (w: Wallet) => void,
    dismiss: () => void,
): HTMLElement {
    const fragment = parseTemplate(WALLET_ITEM_TEMPLATE);
    const item = fragment.querySelector<HTMLElement>('.wallet-item')!;

    // User data via textContent/DOM only — never innerHTML
    item.querySelector('.wallet-icon')!.appendChild(createWalletIcon(wallet.icon));
    item.querySelector('.name')!.textContent = wallet.name;
    item.querySelector('.desc')!.textContent =
        wallet.description ?? wallet.url ?? 'Digital Identity Wallet';

    item.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
        onSelect(wallet);
    });

    return item;
}

function showWalletSelector(options: ShowWalletSelectorOptions): void {
    const { wallets, onSelect, onNative, onCancel } = options;

    document.getElementById(HOST_ID)?.remove();

    const host = document.createElement('div');
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: 'closed' });
    document.body.appendChild(host);

    const dismiss = () => host.remove();

    const style = document.createElement('style');
    style.textContent = STYLES;

    const fragment = parseTemplate(MODAL_TEMPLATE);
    const overlay   = fragment.querySelector<HTMLElement>('.wallet-selector')!;
    const list      = fragment.querySelector<HTMLElement>('.list')!;
    const nativeBtn = fragment.querySelector<HTMLElement>('[data-action="native"]')!;
    const cancelBtn = fragment.querySelector<HTMLElement>('[data-action="cancel"]')!;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { dismiss(); onCancel(); }
    });
    nativeBtn.addEventListener('click', () => { dismiss(); onNative(); });
    cancelBtn.addEventListener('click', () => { dismiss(); onCancel(); });

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

    shadow.append(style, fragment);
}

window.showWalletSelector = showWalletSelector;

// Event bridge: translate window custom events ↔ showWalletSelector calls
window.addEventListener('DC_SHOW_WALLET_SELECTOR', (event) => {
    const { requestId, wallets, requests } = (event as CustomEvent).detail;

    showWalletSelector({
        wallets,
        onSelect(wallet) {
            const selectedRequest =
                requests.find((req: { protocol: string }) =>
                    wallet.protocols?.includes(req.protocol),
                ) ?? requests[0];

            window.dispatchEvent(new CustomEvent('DC_WALLET_SELECTED', {
                detail: { requestId, walletId: wallet.id, wallet, protocol: selectedRequest.protocol, selectedRequest },
            }));
        },
        onNative() {
            window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_RESPONSE', {
                detail: { requestId, useNative: true },
            }));
        },
        onCancel() {
            window.dispatchEvent(new CustomEvent('DC_CREDENTIALS_RESPONSE', {
                detail: { requestId, error: 'User cancelled the request' },
            }));
        },
    });
});
