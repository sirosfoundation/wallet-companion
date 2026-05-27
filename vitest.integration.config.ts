import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@shared': resolve(__dirname, './src/shared'),
			'@background': resolve(__dirname, './src/background'),
			'@content': resolve(__dirname, './src/content'),
			'@ui': resolve(__dirname, './src/ui'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		include: ['tests/integration/**/*.test.ts'],
		exclude: ['**/node_modules/**'],
		testTimeout: 10000,
	},
});
