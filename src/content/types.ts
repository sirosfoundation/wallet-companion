declare global {
	interface Window {
		showWalletSelector: ShowWalletSelectorFunction;
	}
}

export type Wallet = {
	id: string;
	name: string;
	description?: string;
	url?: string;
	icon?: string;
	protocols?: string[];
};

export type ShowWalletSelectorOptions = {
	wallets: Wallet[];
	onSelect: (wallet: Wallet) => void;
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
	wallet: Wallet;
	protocol: string;
	selectedRequest: CredentialRequest;
};

export type DCWalletRegistrationDetail = {
	registrationId: string;
	wallet: Wallet;
};

export type DCWalletCheckDetail = {
	checkId: string;
	url: string;
};

export type DCProtocolsUpdateDetail = {
	updateId: string;
};
