import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHROME_MANIFEST, FIREFOX_MANIFEST, SAFARI_MANIFEST } from './manifests';

const __dirname = dirname(fileURLToPath(import.meta.url));

type Browser = 'chrome' | 'firefox' | 'safari';

const browser = (process.env.BROWSER ?? 'chrome') as Browser;

export default defineConfig(() => {
	process.env.VITE_APP_VERSION = process.env.npm_package_version ?? '0.0.0';

	return {
		define: {
			'process.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION),
		},
		root: resolve(__dirname, 'src'),
		base: './',
		plugins: [
			BrowserExtension({ browser }),
		],
		build: {
			outDir: resolve(__dirname, 'dist', browser),
			emptyOutDir: true,
			target: 'esnext',
			minify: true,
		},
	};
});

type BrowserExtensionConfig = {
	/**
	 * Target browser for the extension build, which determines manifest structure and required assets.
	 */
	browser: Browser;
	/**
	 * Optional array of icon sizes to generate from SVG sources (e.g. [16, 32, 48, 128]).
	 */
	iconSizes?: number[];
};

function BrowserExtension(config: BrowserExtensionConfig): Plugin {
	const iconSizes = config.iconSizes ?? [16, 32, 48, 128];

	const browserManifest = (() => {
		switch (config.browser) {
			case 'chrome':
				return CHROME_MANIFEST;
			case 'firefox':
				return FIREFOX_MANIFEST;
			case 'safari':
				return SAFARI_MANIFEST;
			default:
				throw new Error(`Unsupported browser: ${config.browser}`);
		}
	})();

	browserManifest.setProjectRoot(resolve(__dirname));
	browserManifest.collectSourceFiles();

	return {
		name: 'browser-extension',
		config() {
			return {
				build: {
					rollupOptions: {
						input: browserManifest.getCollectedEntryInputs(),
						output: {
							entryFileNames: '[name].js',
							chunkFileNames: 'chunks/[name]--[hash].js',
							assetFileNames: 'assets/[name]--[hash].[ext]',
						},
					},
				},
			};
		},
		async generateBundle(_, bundle) {
			const projectPrefix = resolve(__dirname) + '/';

			for (const [fileName, chunk] of Object.entries(bundle)) {
				if (chunk.type === 'chunk' && chunk.facadeModuleId?.startsWith(projectPrefix)) {
					const relSource = chunk.facadeModuleId.slice(projectPrefix.length);
					if (!relSource.endsWith('.html')) {
						browserManifest.collectEntryOutputFile(relSource, fileName);
					}
				}
			}

			for (const [key, entry] of browserManifest.getCollectedEntries()) {
				if (entry.source.endsWith('.html')) {
					browserManifest.collectEntryOutputFile(key, entry.source.slice((projectPrefix + 'src/').length));
				}
			}

			for (const [key, icons] of browserManifest.getCollectedIcons()) {
				const generated = await generateIcons(__dirname, icons.source, iconSizes, this);
				browserManifest.collectIconOutputFiles(key, generated);
			}

			const manifest = browserManifest.generateManifest();
			this.emitFile({
				type: 'asset',
				fileName: 'manifest.json',
				source: JSON.stringify(manifest, null, 2),
			});
		},
	};
}

/**
 * Generate PNG icons at standard sizes from an SVG source, emitting them as hashed assets.
 */
async function generateIcons(
	projectRoot: string,
	srcPath: string,
	sizes: readonly number[],
	ctx: { emitFile: (file: { type: 'asset'; name: string; source: Uint8Array }) => string; getFileName: (refId: string) => string },
): Promise<chrome.runtime.ManifestIcons> {
	const svgBuffer = readFileSync(resolve(projectRoot, srcPath));
	const sizeRefs = new Map<number, string>();

	for (const size of sizes) {
		const png = await sharp(svgBuffer)
			.resize(size, size)
			.png()
			.toBuffer();

		const refId = ctx.emitFile({
			type: 'asset',
			name: `icon-${size}.png`,
			source: png,
		});
		sizeRefs.set(size, refId);
	}

	return Object.fromEntries(
		sizes.map((size) => [String(size), ctx.getFileName(sizeRefs.get(size)!)]),
	);
}
