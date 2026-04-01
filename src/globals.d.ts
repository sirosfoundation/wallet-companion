// Firefox uses `browser.*` instead of `chrome.*`.
// Declare it as optionally present so `typeof browser !== 'undefined'` guards work correctly.
declare const browser: typeof chrome | undefined;

declare interface Window {
	showWalletSelector?: (
		wallets: Array<{ id: string; name: string; protocols?: string[] }>,
		onSelect: (wallet: { id: string; name: string; protocols?: string[] }) => void,
		onUseNative: () => void,
		onCancel: () => void,
	) => void;
}