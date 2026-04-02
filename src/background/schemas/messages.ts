import {
	array,
	boolean,
	type InferOutput,
	intersect,
	literal,
	number,
	object,
	pipe,
	string,
	url,
	variant,
} from 'valibot';
import { WalletSchema, WalletsSchema } from './resources';

/**
 * Message types for communication between content scripts and background script.
 */
export enum Messages {
	SHOW_WALLET_SELECTOR = 'SHOW_WALLET_SELECTOR',
	WALLET_SELECTED = 'WALLET_SELECTED',
	GET_WALLETS = 'GET_WALLETS',
	SAVE_WALLETS = 'SAVE_WALLETS',
	GET_SETTINGS = 'GET_SETTINGS',
	SAVE_SETTINGS = 'SAVE_SETTINGS',
	TOGGLE_ENABLED = 'TOGGLE_ENABLED',
	REGISTER_WALLET = 'REGISTER_WALLET',
	CHECK_WALLET = 'CHECK_WALLET',
	GET_SUPPORTED_PROTOCOLS = 'GET_SUPPORTED_PROTOCOLS',
	CONTENT_SCRIPT_READY = 'CONTENT_SCRIPT_READY',
	FETCH_FAVICON = 'FETCH_FAVICON',
}

export const ShowWalletSelectorMessageSchema = object({
	type: literal(Messages.SHOW_WALLET_SELECTOR),
	requests: array(
		object({
			protocol: string(),
		}),
	),
});

export const WalletSelectedMessageSchema = object({
	type: literal(Messages.WALLET_SELECTED),
	walletId: string(),
});

export const GetWalletsMessageSchema = object({
	type: literal(Messages.GET_WALLETS),
});

export const SaveWalletsMessageSchema = object({
	type: literal(Messages.SAVE_WALLETS),
	wallets: WalletsSchema,
});

export const GetSettingsMessageSchema = object({
	type: literal(Messages.GET_SETTINGS),
});

export const SaveSettingsMessageSchema = object({
	type: literal(Messages.SAVE_SETTINGS),
	enabled: boolean(),
	developerMode: boolean(),
});

export const ToggleEnabledMessageSchema = object({
	type: literal(Messages.TOGGLE_ENABLED),
	enabled: boolean(),
});

export const RegisterWalletMessageSchema = object({
	type: literal(Messages.REGISTER_WALLET),
	wallet: WalletSchema,
});

export const CheckWalletMessageSchema = object({
	type: literal(Messages.CHECK_WALLET),
	url: pipe(string(), url()),
});

export const GetSupportedProtocolsMessageSchema = object({
	type: literal(Messages.GET_SUPPORTED_PROTOCOLS),
});

export const ContentScriptReadyMessageSchema = object({
	type: literal(Messages.CONTENT_SCRIPT_READY),
});

export const FetchFaviconMessageSchema = object({
	type: literal(Messages.FETCH_FAVICON),
	url: pipe(string(), url()),
	timeout: number(),
});

const schemaRegistry = {
	[Messages.SHOW_WALLET_SELECTOR]: ShowWalletSelectorMessageSchema,
	[Messages.WALLET_SELECTED]: WalletSelectedMessageSchema,
	[Messages.GET_WALLETS]: GetWalletsMessageSchema,
	[Messages.SAVE_WALLETS]: SaveWalletsMessageSchema,
	[Messages.GET_SETTINGS]: GetSettingsMessageSchema,
	[Messages.SAVE_SETTINGS]: SaveSettingsMessageSchema,
	[Messages.TOGGLE_ENABLED]: ToggleEnabledMessageSchema,
	[Messages.REGISTER_WALLET]: RegisterWalletMessageSchema,
	[Messages.CHECK_WALLET]: CheckWalletMessageSchema,
	[Messages.GET_SUPPORTED_PROTOCOLS]: GetSupportedProtocolsMessageSchema,
	[Messages.CONTENT_SCRIPT_READY]: ContentScriptReadyMessageSchema,
	[Messages.FETCH_FAVICON]: FetchFaviconMessageSchema,
} satisfies Record<Messages, unknown>;

const BaseMessageSchema = object({
	origin: pipe(string(), url()),
});

export const MessageSchema = intersect([
	BaseMessageSchema,
	variant('type', Object.values(schemaRegistry)),
]);

export type Message = InferOutput<typeof MessageSchema>;
