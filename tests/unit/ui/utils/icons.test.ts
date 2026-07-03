/**
 * Tests for UI icon utilities
 *
 * Tests functions for generating wallet icons that are specific to the UI layer.
 * fetchFavicon and generateWalletIconOptions are excluded (require browser APIs).
 * Shared utilities (getColorFromString, generateInitialAvatar, svgToDataUrl) are tested in shared/icons.test.ts.
 */

import {
	generateGeometricIcon,
	generateIdenticon,
	isIconUrl,
} from '../../../../src/ui/utils/icons';
import { svgToDataUrl } from '../../../../src/shared/icons';

describe('UI Icon Utilities', () => {
	describe('generateIdenticon()', () => {
		it('should generate valid SVG', () => {
			const svg = generateIdenticon('test');
			expect(svg).toContain('<svg');
			expect(svg).toContain('</svg>');
			expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
		});

		it('should use default size of 48', () => {
			const svg = generateIdenticon('test');
			expect(svg).toContain('width="48"');
			expect(svg).toContain('height="48"');
		});

		it('should respect custom size', () => {
			const svg = generateIdenticon('test', 64);
			expect(svg).toContain('width="64"');
			expect(svg).toContain('height="64"');
		});

		it('should be deterministic', () => {
			const svg1 = generateIdenticon('wallet');
			const svg2 = generateIdenticon('wallet');
			expect(svg1).toBe(svg2);
		});

		it('should produce different patterns for different inputs', () => {
			const svg1 = generateIdenticon('wallet-a');
			const svg2 = generateIdenticon('wallet-b');
			expect(svg1).not.toBe(svg2);
		});

		it('should contain background rect with rounded corners', () => {
			const svg = generateIdenticon('test');
			expect(svg).toContain('rx="8"');
		});

		it('should contain colored cells (rect elements)', () => {
			const svg = generateIdenticon('test');
			// Should have at least the background rect
			expect(svg).toContain('<rect');
		});

		it('should produce usable data URL when converted', () => {
			const svg = generateIdenticon('test');
			const dataUrl = svgToDataUrl(svg);
			expect(dataUrl).toMatch(/^data:image\/svg\+xml,%3Csvg/);
		});
	});

	describe('generateGeometricIcon()', () => {
		it('should generate valid SVG', () => {
			const svg = generateGeometricIcon('test');
			expect(svg).toContain('<svg');
			expect(svg).toContain('</svg>');
		});

		it('should use default size of 48', () => {
			const svg = generateGeometricIcon('test');
			expect(svg).toContain('width="48"');
			expect(svg).toContain('height="48"');
		});

		it('should respect custom size', () => {
			const svg = generateGeometricIcon('test', 64);
			expect(svg).toContain('width="64"');
			expect(svg).toContain('height="64"');
		});

		it('should be deterministic', () => {
			const svg1 = generateGeometricIcon('wallet');
			const svg2 = generateGeometricIcon('wallet');
			expect(svg1).toBe(svg2);
		});

		it('should produce different patterns for different inputs', () => {
			// Test several inputs to find ones that produce different patterns
			const patterns = new Set<string>();
			const inputs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
			for (const input of inputs) {
				patterns.add(generateGeometricIcon(input));
			}
			// Should have at least 2 different patterns
			expect(patterns.size).toBeGreaterThan(1);
		});

		it('should contain geometric shapes', () => {
			// Generate multiple to test different pattern types
			const svgs = ['test1', 'test2', 'test3', 'test4'].map((input) => generateGeometricIcon(input));
			const hasCircle = svgs.some((svg) => svg.includes('<circle'));
			const hasPolygon = svgs.some((svg) => svg.includes('<polygon'));
			const hasRect = svgs.some((svg) => svg.includes('<rect'));
			// At least one of these should be true (besides background rect)
			expect(hasCircle || hasPolygon || hasRect).toBe(true);
		});

		it('should produce usable data URL when converted', () => {
			const svg = generateGeometricIcon('test');
			const dataUrl = svgToDataUrl(svg);
			expect(dataUrl).toMatch(/^data:image\/svg\+xml,%3Csvg/);
		});
	});

	describe('isIconUrl()', () => {
		it('should return true for data URLs', () => {
			expect(isIconUrl('data:image/svg+xml,...')).toBe(true);
			expect(isIconUrl('data:image/png;base64,abc')).toBe(true);
		});

		it('should return true for http URLs', () => {
			expect(isIconUrl('http://example.com/icon.png')).toBe(true);
		});

		it('should return true for https URLs', () => {
			expect(isIconUrl('https://example.com/icon.png')).toBe(true);
		});

		it('should return false for empty string', () => {
			expect(isIconUrl('')).toBe(false);
		});

		it('should return false for emoji', () => {
			expect(isIconUrl('🏦')).toBe(false);
			expect(isIconUrl('💼')).toBe(false);
		});

		it('should return false for plain text', () => {
			expect(isIconUrl('wallet')).toBe(false);
			expect(isIconUrl('icon')).toBe(false);
		});

		it('should return false for relative paths', () => {
			expect(isIconUrl('/icons/wallet.png')).toBe(false);
			expect(isIconUrl('./icon.svg')).toBe(false);
		});
	});
});
