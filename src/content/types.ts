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
}

export type ShowWalletSelectorFunction = (options: ShowWalletSelectorOptions) => void;
