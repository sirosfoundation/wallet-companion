declare global {
	interface Window {
		showWalletSelector: ShowWalletSelectorFunction;
	}
}

/**
 * For the stored wallet format, see `Wallet` in `@shared/schemas/resources`.
 */
export type WalletOption = {
	id: string;
	name: string;
	description?: string;
	url?: string;
	icon?: string;
	protocols?: string[];
};

export type ShowWalletSelectorOptions = {
	wallets: WalletOption[];
	onSelect: (wallet: WalletOption) => void;
	onNative: () => void;
	onCancel: () => void;
};

export type ShowWalletSelectorFunction = (options: ShowWalletSelectorOptions) => void;

export type CredentialRequest = {
	protocol: string;
	data: unknown;
};

export type DCCredentialsRequestDetail = {
	requestId: string;
	requests: CredentialRequest[];
	options: unknown;
};

export type DCWalletSelectedDetail = {
	requestId: string;
	walletId: string;
	wallet: WalletOption;
	protocol: string;
	selectedRequest: CredentialRequest;
};

export type DCWalletRegistrationDetail = {
	registrationId: string;
	wallet: WalletOption;
};

export type DCWalletCheckDetail = {
	checkId: string;
	url: string;
};

export type DCProtocolsUpdateDetail = {
	updateId: string;
};
