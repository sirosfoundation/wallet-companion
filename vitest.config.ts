import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.spec.ts'],
		exclude: [
			'**/node_modules/**',
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
