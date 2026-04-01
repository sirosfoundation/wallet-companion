import { defineConfig, type Plugin, build as viteBuild } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { 
	CHROME_MANIFEST, 
	FIREFOX_MANIFEST, 
	SAFARI_MANIFEST ,
	type UseFile, 
	type MatchFiles, 
	type IconsFrom, 
} from './manifests';

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
	/**
	 * Optional array of glob patterns that should be built as IIFE format for content scripts.
	 */
	iifePatterns?: string[];
};

function BrowserExtension(config: BrowserExtensionConfig): Plugin {
	const iconSizes = config.iconSizes ?? [16, 32, 48, 128];
	const iifePatterns = config.iifePatterns ?? ['src/content/'];
	const isIIFE = (file: string) => iifePatterns.some((p) => file.startsWith(p));

	const getManifest = (() => {
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

	let srcRoot: string;
	let outDir: string;
	let resolveIconsFrom: IconsFrom | undefined;

	// Entries split by output format
	const esmEntries = new Map<string, string>();
	const iifeEntries = new Map<string, string>();

	// Combined output map populated across both builds
	const outputMap = new Map<string, string>();

	return {
		name: 'browser-extension',
		config(cfg) {
			srcRoot = cfg.root ?? process.cwd();
			outDir = (cfg.build?.outDir as string | undefined) ?? resolve(__dirname, 'dist');

			esmEntries.clear();
			iifeEntries.clear();

			const collectUse: UseFile = (file) => {
				const key = file.replace(/^src\//, '').replace(/\.[^.]+$/, '');
				const abs = resolve(srcRoot, file.replace(/^src\//, ''));
				(isIIFE(file) ? iifeEntries : esmEntries).set(key, abs);
				return file;
			};

			const collectMatch: MatchFiles = (pattern) => {
				const stripped = pattern.replace(/^src\//, '');
				const { dir, files } = expandGlob(srcRoot, stripped);
				for (const f of files) {
					const key = `${dir}/${f.replace(/\.[^.]+$/, '')}`;
					const abs = resolve(srcRoot, dir, f);
					(isIIFE(`${dir}/${f}`) ? iifeEntries : esmEntries).set(key, abs);
				}
				return files.map((f) => `${dir}/${f}`);
			};

			getManifest(collectUse, collectMatch, () => ({}));

			return {
				build: {
					rollupOptions: {
						// Main build: ESM entries only (background, ui pages)
						input: Object.fromEntries(esmEntries),
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
			const srcPrefix = srcRoot + '/';

			for (const [fileName, chunk] of Object.entries(bundle)) {
				if (chunk.type === 'chunk' && chunk.facadeModuleId?.startsWith(srcPrefix)) {
					const relSource = chunk.facadeModuleId.slice(srcPrefix.length);
					if (!relSource.endsWith('.html')) {
						outputMap.set(relSource, fileName);
					}
				}
				if (chunk.type === 'asset') {
					outputMap.set(fileName, fileName);
				}
			}

			// Emit icons during the main build so they're part of the asset pipeline
			const iconSources = new Set<string>();
			getManifest((f) => f, (p) => [p], (file) => { iconSources.add(file.replace(/^src\//, '')); return {}; });
			resolveIconsFrom = await generateIcons(srcRoot, iconSources, iconSizes, this);
		},
		async closeBundle() {
			if (iifeEntries.size > 0) {
				// IIFE format doesn't support multiple inputs — build each entry separately
				for (const [key, absPath] of iifeEntries) {
					const result = await viteBuild({
						configFile: false,
						root: srcRoot,
						build: {
							outDir,
							emptyOutDir: false,
							target: 'esnext',
							minify: true,
							rollupOptions: {
								input: { [key]: absPath },
								output: {
									format: 'iife',
									entryFileNames: '[name].js',
								},
							},
						},
					});
					
					const outputs = Array.isArray(result) ? result : [result];
					for (const output of outputs) {
						if ('output' in output) {
							for (const chunk of output.output) {
								if (chunk.type === 'chunk' && chunk.facadeModuleId) {
									const rel = chunk.facadeModuleId.startsWith(srcRoot + '/')
									? chunk.facadeModuleId.slice(srcRoot.length + 1)
									: chunk.facadeModuleId;
									outputMap.set(rel, chunk.fileName);
								}
							}
						}
					}
				}
			}

			// Now write manifest with full output map (ESM + IIFE)
			const resolveUse: UseFile = (file) => {
				const key = file.replace(/^src\//, '');
				return outputMap.get(key) ?? key;
			};
			const resolveMatch: MatchFiles = (pattern) => {
				const stripped = pattern.replace(/^src\//, '');
				const { dir, files } = expandGlob(srcRoot, stripped);
				return files.map((f) => outputMap.get(`${dir}/${f}`) ?? `${dir}/${f}`);
			};

			const resolved = getManifest(resolveUse, resolveMatch, resolveIconsFrom ?? (() => ({})));
			await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(resolved, null, 2));
		},
	} as Plugin;
}

/** 
 * Expand a glob pattern (e.g. 'dir/*.js') into matching filenames from srcRoot. 
 */
function expandGlob(srcRoot: string, pattern: string): { dir: string; files: string[] } {
	const dir = dirname(pattern);
	const ext = pattern.split('*').pop()!;
	const files = readdirSync(resolve(srcRoot, dir)).filter((f) => f.endsWith(ext));
	return { dir, files };
}

/** 
 * Generate PNG icons at standard sizes from an SVG source, emitting them as hashed assets. 
 */
async function generateIcons(
	srcRoot: string,
	svgSources: Iterable<string>,
	sizes: readonly number[],
	ctx: { emitFile: (file: { type: 'asset'; name: string; source: Uint8Array }) => string; getFileName: (refId: string) => string },
): Promise<IconsFrom> {
	const iconRefs = new Map<string, Map<number, string>>();

	for (const file of svgSources) {
		const svgBuffer = readFileSync(resolve(srcRoot, file));
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
		iconRefs.set(file, sizeRefs);
	}

	return (file) => {
		const sizeRefs = iconRefs.get(file.replace(/^src\//, ''))!;
		return Object.fromEntries(
			sizes.map((size) => [String(size), ctx.getFileName(sizeRefs.get(size)!)]),
		);
	};
}