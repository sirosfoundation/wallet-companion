import { BrowserManifest } from "./resources";

const VERSION = process.env.npm_package_version ?? '0.0.0';

export const CHROME_MANIFEST = new BrowserManifest(({ entry, icons }) => ({
	'manifest_version': 3,
	'name': 'Wallet Companion',
	'version': VERSION,
	'description': 'A cross-browser companion extension that intercepts W3C Digital Credentials API calls, enabling users to select from multiple digital identity wallet providers.',
	'permissions': [
		'storage',
		'activeTab',
		'scripting'
	],
	'host_permissions': ['<all_urls>'],
	'background': {
		'service_worker': entry('src/background/index.js'),
	},
	'content_scripts': [
		{
			'matches': ['<all_urls>'],
			'js': [entry('src/content/index.js')],
			'run_at': 'document_start',
		},
	],
	'web_accessible_resources': [
		{
			'resources': [
				entry('src/content/inject.js'),
				entry('src/content/modal.js'),
			],
			'matches': ['<all_urls>'],
		},
	],
	'action': {
		'default_popup': entry('src/ui/popup.html'),
		'default_icon': icons('src/ui/assets/icons/logo-dark.svg'),
	},
	'options_page': entry('src/ui/options.html'),
	'icons': icons('src/ui/assets/icons/logo-dark.svg'),
}));

export const FIREFOX_MANIFEST = new BrowserManifest(({ entry, icons }) => ({
	'manifest_version': 2,
	'name': 'Wallet Companion',
	'version': VERSION,
	'description': 'A cross-browser companion extension that intercepts W3C Digital Credentials API calls, enabling users to select from multiple digital identity wallet providers.',
	'permissions': [
		'storage',
		'<all_urls>'
	],
	'background': {
		'scripts': [entry('src/background/index.js')],
	},
	'content_scripts': [
		{
			'matches': ['<all_urls>'],
			'js': [entry('src/content/index.js')],
			'run_at': 'document_start'
		}
	],
	'web_accessible_resources': [
		entry('src/content/inject.js'),
		entry('src/content/modal.js'),
	],
	'browser_action': {
		'default_popup': entry('src/ui/popup.html'),
		'default_icon': icons('src/ui/assets/icons/logo-dark.svg'),
	},
	'options_ui': {
		'page': entry('src/ui/options.html'),
		'open_in_tab': true
	},
	'icons': icons('src/ui/assets/icons/logo-dark.svg'),
	'browser_specific_settings': {
		'gecko': {
			'id': 'digital-credentials-wallet-selector@example.com',
			'strict_min_version': '91.0'
		}
	}
}));

export const SAFARI_MANIFEST = new BrowserManifest(({ entry, icons }) => ({
	'manifest_version': 2,
	'name': 'Wallet Companion',
	'version': VERSION,
	'description': 'A cross-browser companion extension that intercepts W3C Digital Credentials API calls, enabling users to select from multiple digital identity wallet providers.',
	'permissions': [
		'storage',
		'<all_urls>'
	],
	'background': {
		'scripts': [entry('src/background/index.js')],
		'persistent': false
	},
	'content_scripts': [
	{
		'matches': ['<all_urls>'],
		'js': [entry('src/content/index.js')],
		'run_at': 'document_start'
	}
	],
	'web_accessible_resources': [
		entry('src/content/inject.js'),
		entry('src/content/modal.js'),
	],
	'browser_action': {
		'default_popup': entry('src/ui/popup.html'),
		'default_icon': icons('src/ui/assets/icons/logo-dark.svg'),
	},
	'options_ui': {
		'page': entry('src/ui/options.html'),
		'open_in_tab': true
	},
	'icons': icons('src/ui/assets/icons/logo-dark.svg'),
}));
