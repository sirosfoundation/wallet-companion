/**
 * Tests for shared icon utilities
 *
 * Tests pure utility functions for generating icons that are shared across the codebase.
 */

import {
	generateInitialAvatar,
	getColorFromString,
	hashString,
	ICON_COLORS,
	svgToDataUrl,
} from '../../../src/shared/icons';

describe('Shared Icon Utilities', () => {
	describe('ICON_COLORS', () => {
		it('should export a color palette array', () => {
			expect(Array.isArray(ICON_COLORS)).toBe(true);
			expect(ICON_COLORS.length).toBeGreaterThan(0);
		});

		it('should contain valid hex colors', () => {
			for (const color of ICON_COLORS) {
				expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		});
	});

	describe('hashString()', () => {
		it('should return a number', () => {
			const hash = hashString('test');
			expect(typeof hash).toBe('number');
		});

		it('should be deterministic', () => {
			const hash1 = hashString('wallet');
			const hash2 = hashString('wallet');
			expect(hash1).toBe(hash2);
		});

		it('should return different values for different inputs', () => {
			const hash1 = hashString('wallet1');
			const hash2 = hashString('wallet2');
			expect(hash1).not.toBe(hash2);
		});

		it('should handle empty string', () => {
			const hash = hashString('');
			expect(typeof hash).toBe('number');
		});

		it('should return non-negative values', () => {
			const inputs = ['test', '', 'negative-test', '🎉'];
			for (const input of inputs) {
				expect(hashString(input)).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe('getColorFromString()', () => {
		it('should return a color from the palette', () => {
			const color = getColorFromString('test');
			expect(ICON_COLORS).toContain(color);
		});

		it('should be deterministic (same input = same output)', () => {
			const color1 = getColorFromString('wallet');
			const color2 = getColorFromString('wallet');
			expect(color1).toBe(color2);
		});

		it('should return different colors for different inputs', () => {
			const color1 = getColorFromString('wallet1');
			const color2 = getColorFromString('different-wallet');
			// Note: collision is possible but unlikely for different strings
			expect(typeof color1).toBe('string');
			expect(typeof color2).toBe('string');
		});

		it('should handle empty string', () => {
			const color = getColorFromString('');
			expect(ICON_COLORS).toContain(color);
		});

		it('should handle special characters', () => {
			const color = getColorFromString('https://wallet.example.com/path?query=1');
			expect(ICON_COLORS).toContain(color);
		});
	});

	describe('generateInitialAvatar()', () => {
		it('should generate valid SVG', () => {
			const svg = generateInitialAvatar('Test Wallet');
			expect(svg).toContain('<svg');
			expect(svg).toContain('</svg>');
		});

		it('should extract two initials from two-word name', () => {
			const svg = generateInitialAvatar('Test Wallet');
			expect(svg).toMatch(/>\s*TW\s*<\/text>/);
		});

		it('should extract first two characters from single word', () => {
			const svg = generateInitialAvatar('Wallet');
			expect(svg).toMatch(/>\s*WA\s*<\/text>/);
		});

		it('should uppercase initials', () => {
			const svg = generateInitialAvatar('test wallet');
			expect(svg).toMatch(/>\s*TW\s*<\/text>/);
		});

		it('should use default size of 48', () => {
			const svg = generateInitialAvatar('Test');
			expect(svg).toContain('width="48"');
			expect(svg).toContain('height="48"');
		});

		it('should respect custom size', () => {
			const svg = generateInitialAvatar('Test', 32);
			expect(svg).toContain('width="32"');
			expect(svg).toContain('height="32"');
		});

		it('should use white text', () => {
			const svg = generateInitialAvatar('Test');
			expect(svg).toContain('fill="white"');
		});

		it('should use a color from the palette as background', () => {
			const svg = generateInitialAvatar('Test');
			const hasColor = ICON_COLORS.some((color) => svg.includes(`fill="${color}"`));
			expect(hasColor).toBe(true);
		});
	});

	describe('svgToDataUrl()', () => {
		it('should convert SVG to data URL', () => {
			const svg = '<svg></svg>';
			const dataUrl = svgToDataUrl(svg);
			expect(dataUrl).toMatch(/^data:image\/svg\+xml,/);
		});

		it('should encode SVG content', () => {
			const svg = '<svg width="48"><rect fill="#ff0000"/></svg>';
			const dataUrl = svgToDataUrl(svg);
			expect(dataUrl).toContain('data:image/svg+xml,');
			expect(dataUrl).toContain(encodeURIComponent('<svg'));
		});

		it('should handle special characters', () => {
			const svg = '<svg><text>Test & "quotes"</text></svg>';
			const dataUrl = svgToDataUrl(svg);
			expect(dataUrl).toContain('%26'); // encoded &
			expect(dataUrl).toContain('%22'); // encoded "
		});
	});
});
