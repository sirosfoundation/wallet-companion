import { BrowserManifest } from "./resources";

const NAME = '__MSG_extension_name__';
const DESCRIPTION = '__MSG_extension_description__';
const VERSION = (process.env.npm_package_version ?? '0.0.0').replace(/-.*$/, '');

export const CHROME_MANIFEST = new BrowserManifest(({ entry, icons }) => ({
	'manifest_version': 3,
	'name': NAME,
	'version': VERSION,
	'description': DESCRIPTION,
	'default_locale': 'en',
	'permissions': [
		'storage',
	],
	'host_permissions': ['<all_urls>'],
	'background': {
		'service_worker': entry('es', 'src/background/index.ts'),
		'type': 'module',
	},
	'content_scripts': [
		{
			'matches': ['<all_urls>'],
			'js': [entry('iife', 'src/content/index.ts')],
			'run_at': 'document_start',
		},
	],
	'web_accessible_resources': [
		{
			'resources': [
				entry('iife', 'src/content/inject.ts'),
				'_locales/**/messages.json',
			],
			'matches': ['<all_urls>'],
		},
	],
	'action': {
		'default_popup': entry('es', 'src/ui/popup.html'),
		'default_icon': icons('src/shared/assets/icons/logo-dark.svg'),
	},
	'options_page': entry('es', 'src/ui/options.html'),
	'icons': icons('src/shared/assets/icons/logo-dark.svg'),
}));

export const FIREFOX_MANIFEST = new BrowserManifest(({ entry, icons }) => ({
	'manifest_version': 3,
	'name': NAME,
	'version': VERSION,
	'description': DESCRIPTION,
	'default_locale': 'en',
	'permissions': [
		'storage',
	],
	'host_permissions': ['<all_urls>'],
	'background': {
		'scripts': [entry('es', 'src/background/index.ts')],
		'type': 'module',
	},
	'content_scripts': [
		{
			'matches': ['<all_urls>'],
			'js': [entry('iife', 'src/content/index.ts')],
			'run_at': 'document_start'
		}
	],
	'web_accessible_resources': [
		{
			'resources': [
				entry('iife', 'src/content/inject.ts'),
				'_locales/**/messages.json',
			],
			'matches': ['<all_urls>'],
		},
	],
	'action': {
		'default_popup': entry('es', 'src/ui/popup.html'),
		'default_icon': icons('src/shared/assets/icons/logo-dark.svg'),
	},
	'options_page': entry('es', 'src/ui/options.html'),
	'icons': icons('src/shared/assets/icons/logo-dark.svg'),
	'browser_specific_settings': {
		'gecko': {
			'id': 'wallet-companion@siros.org',
			'strict_min_version': '109.0'
		}
	}
}));

export const SAFARI_MANIFEST = new BrowserManifest(({ entry, icons }) => ({
	'manifest_version': 3,
	'name': NAME,
	'version': VERSION,
	'description': DESCRIPTION,
	'default_locale': 'en',
	'permissions': [
		'storage',
	],
	'host_permissions': ['<all_urls>'],
	'background': {
		'service_worker': entry('es', 'src/background/index.ts'),
		'type': 'module'
	},
	'content_scripts': [
	{
		'matches': ['<all_urls>'],
		'js': [entry('iife', 'src/content/index.ts')],
		'run_at': 'document_start'
	}
	],
	'web_accessible_resources': [
		{
			'resources': [
				entry('iife', 'src/content/inject.ts'),
				'_locales/**/messages.json',
			],
			'matches': ['<all_urls>'],
		},
	],
	'action': {
		'default_popup': entry('es', 'src/ui/popup.html'),
		'default_icon': icons('src/shared/assets/icons/logo-dark.svg'),
	},
	'options_page': entry('es', 'src/ui/options.html'),
	'icons': icons('src/shared/assets/icons/logo-dark.svg'),
}));
