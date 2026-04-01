import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.js'],
		include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
		exclude: [
			'**/node_modules/**',
			'tests/integration.test.js',
			'tests/wallet-integration.test.js',
		],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.js'],
			exclude: ['src/**/*.test.js'],
			reporter: ['text', 'lcov', 'html'],
			reportsDirectory: 'coverage',
		},
	},
});
