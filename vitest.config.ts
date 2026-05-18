import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
		exclude: [
			'**/node_modules/**',
			'tests/integration.test.ts',
			'tests/wallet-integration.test.ts',
		],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts'],
			reporter: ['text', 'lcov', 'html'],
			reportsDirectory: 'coverage',
		},
	},
});
