import modalStyles from '@content/style/register-wallet-consent.css?inline';
import logo from '@shared/assets/icons/logo-dark.svg?inline';
import { getMessageGroup } from '@shared/i18n';
import globalStyles from '@shared/style/global.css?inline';
import { createElement, X } from 'lucide';

type RegisterWalletConsentModalOptions = {
	name: string;
	url: string;
};

type RegisterWalletConsentModalResult = { status: 'approved' | 'declined' };

const HOST_ID = 'wc-register-wallet-host';

function createModal(name: string, url: string): HTMLDialogElement {
	const template = document.createElement('template');
	template.innerHTML = modalTemplate().trim();
	const dialog = template.content.querySelector('dialog');
	if (!dialog) throw new Error('Failed to create modal');

	const icon = dialog.querySelector<HTMLImageElement>(
		'.register-wallet > .header > .title > .icon',
	);
	if (!icon) throw new Error('Failed to create modal: missing icon element');

	const closeButton = dialog.querySelector<HTMLButtonElement>(
		'.register-wallet > .header > .close',
	);
	if (!closeButton) throw new Error('Failed to create modal: missing close button');

	const nameField = dialog.querySelector<HTMLElement>('.details .detail .value.-name');
	const urlField = dialog.querySelector<HTMLElement>('.details .detail .value.-url');

	if (!nameField || !urlField) {
		throw new Error('Failed to create modal: missing detail fields');
	}

	icon.src = logo;
	closeButton.innerHTML = createElement(X, { width: 24, height: 24 }).outerHTML;
	nameField.textContent = name;
	urlField.textContent = url;

	return dialog;
}

/**
 * Show register wallet modal.
 *
 * Allows user to consent to a registration request from a wallet.
 */
export function registerWalletConsentModal({
	name,
	url,
}: RegisterWalletConsentModalOptions): Promise<RegisterWalletConsentModalResult> {
	return new Promise((resolve, reject) => {
		const existing = document.getElementById(HOST_ID);
		if (existing) {
			existing.remove();
			reject(new Error('A wallet registration is already in progress'));
			return;
		}

		const host = document.createElement('div');
		host.style.opacity = '1';
		host.id = HOST_ID;
		const shadow = host.attachShadow({ mode: 'closed' });
		document.body.appendChild(host);

		const modal = createModal(name, url);

		shadow.adoptedStyleSheets = [globalStyles, modalStyles].map((styles) => {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(styles);
			return sheet;
		});

		shadow.append(modal);

		modal.show();

		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;

			event.preventDefault();
			dismiss();
			resolve({ status: 'declined' });
		};

		document.addEventListener('keydown', handleKeydown);

		// Remove the host, not just the dialog
		const dismiss = () => {
			document.removeEventListener('keydown', handleKeydown);
			const fallback = setTimeout(() => host.remove(), 350);
			modal.addEventListener(
				'animationend',
				() => {
					clearTimeout(fallback);
					host.remove();
				},
				{ once: true },
			);
			modal.classList.add('-closing');
		};

		const closeButton = modal.querySelector<HTMLButtonElement>(
			'.register-wallet > .header > .close',
		);
		if (!closeButton) {
			host.remove();
			reject(new Error('Failed to create modal: missing close button'));
			return;
		}

		closeButton.addEventListener('click', (event) => {
			event.preventDefault();
			dismiss();
			resolve({ status: 'declined' });
		});

		const declineButton = modal.querySelector<HTMLButtonElement>(
			'.buttons > .s-button[data-action="decline"]',
		);
		if (!declineButton) {
			host.remove();
			reject(new Error('Failed to create modal: missing decline button'));
			return;
		}

		declineButton.addEventListener('click', (event) => {
			event.preventDefault();
			dismiss();
			resolve({ status: 'declined' });
		});

		const approveButton = modal.querySelector<HTMLButtonElement>(
			'.buttons > .s-button[data-action="approve"]',
		);
		if (!approveButton) {
			reject(new Error('Failed to create modal: missing approve button'));
			return;
		}

		approveButton.addEventListener('click', (event) => {
			event.preventDefault();
			dismiss();
			resolve({ status: 'approved' });
		});
	});
}

function modalTemplate() {
	const t = getMessageGroup('content_modals_register_wallet');

	return `
<dialog class="register-wallet">
	<div class="header">
		<h1 class="title">
			<img class="icon" alt="Wallet Companion" />
			<span>${t('title')}</span>
		</h1>
		<button class="s-button -invisible -square -small close" commandfor="my-dialog" command="close"></button>
	</div>
	<div class="content">
		<p>${t('description')}</p>
		<dl class="details">
			<div class="detail">
				<dt class="name">${t('name_label')}</dt>
				<dd class="value -name"></dd>
			</div>
			<div class="detail">
				<dt class="name">${t('url_label')}</dt>
				<dd class="value -url"></dd>
			</div>
		</dl>
		<p>${t('info')}</p>
	</div>
	<div class="buttons">
		<button class="s-button -outline" data-action="decline">${t('decline')}</button>
		<button class="s-button -primary" data-action="approve">${t('approve')}</button>
	</div>
</dialog>
`;
}
