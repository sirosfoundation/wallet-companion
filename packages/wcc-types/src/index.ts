import { WalletCompanionInterface } from './WalletCompanionInterface';

declare global {
    interface Window {
        /**
         * Client API for the Wallet Companion browser extension.
         *
         * Undefined when the extension is not installed. Use optional chaining to check availability:
         *
         * @example
         * ```typescript
         * if (window.WalletCompanion?.isInstalled) {
         *   await window.WalletCompanion.registerWallet({
         *     name: 'My Wallet',
         *     url: 'https://wallet.example.com',
         *     protocols: ['openid4vp'],
         *   });
         * }
         * ```
         *
         * @see https://github.com/sirosfoundation/wallet-companion
         */
        WalletCompanion?: WalletCompanionInterface;
    }
}

export * from './WalletCompanionInterface';
