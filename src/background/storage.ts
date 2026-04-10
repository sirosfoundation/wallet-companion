import type { Options, UsageStats, Wallet } from '@shared/schemas/resources';

// Storage keys
export enum StorageKey {
	WALLETS = 'configured_wallets',
	STATS = 'usage_stats',
	OPTIONS = 'options',
}

export type StorageSchema = {
	[StorageKey.WALLETS]: Wallet[];
	[StorageKey.STATS]: UsageStats;
	[StorageKey.OPTIONS]: Options;
};

interface StorageAreaCompat {
	get(keys: string | string[] | null): Promise<Record<string, unknown>>;
	set(items: Record<string, unknown>): Promise<void>;
}

abstract class BaseStore<T extends StorageKey> {
	#storage: StorageAreaCompat;
	abstract StorageKey: keyof StorageSchema;

	constructor() {
		this.#storage = (typeof browser !== 'undefined' ? browser.storage : chrome.storage).local;
	}

	protected async get(): Promise<StorageSchema[T] | undefined> {
		const result = await this.#storage.get(this.StorageKey);
		return result[this.StorageKey] as StorageSchema[T] | undefined;
	}

	protected async set(data: Partial<StorageSchema[T]>): Promise<void> {
		await this.#storage.set({ [this.StorageKey]: data });
	}
}

class OptionsStore extends BaseStore<StorageKey.OPTIONS> {
	StorageKey = StorageKey.OPTIONS;

	async getOptions(): Promise<StorageSchema[StorageKey.OPTIONS] | undefined> {
		return await this.get();
	}

	async updateOptions(options: Partial<StorageSchema[StorageKey.OPTIONS]>): Promise<void> {
		const currentOptions = await this.get();
		await this.set({ ...currentOptions, ...options });
	}

	async getEnabled(): Promise<boolean | undefined> {
		const result = await this.get();
		return result?.enabled;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.set({ ...(await this.get()), enabled });
	}

	async getDeveloperMode(): Promise<boolean | undefined> {
		const result = await this.get();
		return result?.developerMode;
	}

	async setDeveloperMode(developerMode: boolean): Promise<void> {
		await this.set({ ...(await this.get()), developerMode });
	}
}

class WalletStore extends BaseStore<StorageKey.WALLETS> {
	StorageKey = StorageKey.WALLETS;

	async getOne(id: string): Promise<Wallet | undefined> {
		const wallets = await this.get();
		return wallets?.find((wallet) => wallet.id === id);
	}

	async setOne(wallet: Wallet): Promise<void> {
		const wallets = (await this.get()) || [];
		const existingIndex = wallets.findIndex((w) => w.id === wallet.id);

		if (existingIndex !== -1) {
			// Update existing wallet
			wallets[existingIndex] = wallet;
		} else {
			// Add new wallet
			wallets.push(wallet);
		}

		await this.setAll(wallets);
	}

	async removeOne(id: string): Promise<void> {
		const wallets = (await this.get()) || [];
		const updatedWallets = wallets.filter((wallet) => wallet.id !== id);
		await this.setAll(updatedWallets);
	}

	async getAll(): Promise<StorageSchema[StorageKey.WALLETS]> {
		const result = await this.get();
		return result || [];
	}

	async setAll(wallets: StorageSchema[StorageKey.WALLETS]): Promise<void> {
		await this.set(wallets);
	}
}

class StatsStore extends BaseStore<StorageKey.STATS> {
	StorageKey = StorageKey.STATS;

	async getStats(): Promise<StorageSchema[StorageKey.STATS] | undefined> {
		return await this.get();
	}

	async setStats(stats: StorageSchema[StorageKey.STATS]): Promise<void> {
		await this.set(stats);
	}
}

export const Stores = {
	wallets: new WalletStore(),
	stats: new StatsStore(),
	options: new OptionsStore(),
};
