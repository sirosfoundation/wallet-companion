/** Resolves a single source file path to its output path. */
export type UseFile = (file: string) => string;
/** Resolves a glob pattern to an array of output paths. */
export type MatchFiles = (pattern: string) => string[];
/** Generates a browser extension manifest, given functions to resolve source files to output files.*/
export type IconsFrom = (dir: string) => chrome.runtime.ManifestIcons;

export type BrowserManifest = (
	use: UseFile,
	match: MatchFiles,
	iconsFrom: IconsFrom
) => chrome.runtime.ManifestV3 | chrome.runtime.ManifestV2;

const VERSION = process.env.npm_package_version ?? '0.0.0';

export const CHROME_MANIFEST: BrowserManifest = (use, match, iconsFrom) => ({
	'manifest_version': 3,
	'name': 'Digital Credentials Wallet Selector',
	'version': VERSION,
	'description': 'Intercepts W3C Digital Credentials API calls and provides wallet selection',
	'permissions': [
		'storage',
		'activeTab',
		'scripting'
	],
	'host_permissions': ['<all_urls>'],
	'background': {
		'service_worker': use('src/background/index.js'),
	},
	'content_scripts': [
		{
			'matches': ['<all_urls>'],
			'js': [use('src/content/index.js')],
			'run_at': 'document_start',
		},
	],
	'web_accessible_resources': [
		{
			'resources': [
				use('src/content/inject.js'),
				use('src/content/modal.js'),
			],
			'matches': ['<all_urls>'],
		},
	],
	'action': {
		'default_popup': use('src/ui/popup/index.html'),
		'default_icon': iconsFrom('src/ui/assets/icons/logo-dark.svg'),
	},
	'options_page': use('src/ui/options/index.html'),
	'icons': iconsFrom('src/ui/assets/icons/logo-dark.svg'),
});

export const FIREFOX_MANIFEST: BrowserManifest = (use, match, iconsFrom) => ({
	'manifest_version': 2,
	'name': 'Digital Credentials Wallet Selector',
	'version': VERSION,
	'description': 'Intercepts W3C Digital Credentials API calls and provides wallet selection',
	'permissions': [
		'storage',
		'<all_urls>'
	],
	'background': {
		'scripts': [use('src/background/index.js')],
	},
	'content_scripts': [
		{
			'matches': ['<all_urls>'],
			'js': [use('src/content/index.js')],
			'run_at': 'document_start'
		}
	],
	'web_accessible_resources': [
		use('src/content/inject.js'),
		use('src/content/modal.js'),
	],
	'browser_action': {
		'default_popup': use('src/ui/popup/index.html'),
		'default_icon': iconsFrom('src/ui/assets/icons/logo-dark.svg'),
	},
	'options_ui': {
		'page': use('src/ui/options/index.html'),
		'open_in_tab': true
	},
	'icons': iconsFrom('src/ui/assets/icons/logo-dark.svg'),
	'browser_specific_settings': {
		'gecko': {
			'id': 'digital-credentials-wallet-selector@example.com',
			'strict_min_version': '91.0'
		}
	}
});

export const SAFARI_MANIFEST: BrowserManifest = (use, match, iconsFrom) => ({
	'manifest_version': 2,
	'name': 'Digital Credentials Wallet Selector',
	'version': VERSION,
	'description': 'Intercepts W3C Digital Credentials API calls and provides wallet selection',
	'permissions': [
		'storage',
		'<all_urls>'
	],
	'background': {
		'scripts': [use('src/background/index.js')],
		'persistent': false
	},
	'content_scripts': [
	{
		'matches': ['<all_urls>'],
		'js': [use('src/content/index.js')],
		'run_at': 'document_start'
	}
	],
	'web_accessible_resources': [
		use('src/content/inject.js'),
		use('src/content/modal.js'),
	],
	'browser_action': {
		'default_popup': use('src/ui/popup/index.html'),
		'default_icon': iconsFrom('src/ui/assets/icons/logo-dark.svg'),
	},
	'options_ui': {
		'page': use('src/ui/options/index.html'),
		'open_in_tab': true
	},
	'icons': iconsFrom('src/ui/assets/icons/logo-dark.svg'),
});
