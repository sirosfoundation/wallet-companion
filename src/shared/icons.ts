/**
 * Color palette for generated icons (brand-safe colors)
 */
export const ICON_COLORS = [
	'#1C4587', // Primary blue
	'#19712f', // Green
	'#7c3aed', // Purple
	'#ea580c', // Orange
	'#0891b2', // Cyan
	'#be185d', // Pink
	'#4f46e5', // Indigo
	'#059669', // Emerald
	'#dc2626', // Red
	'#ca8a04', // Yellow
];

/**
 * Generate a deterministic hash from a string
 */
export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash);
}

/**
 * Get a color from the palette based on input string
 */
export function getColorFromString(str: string): string {
	const hash = hashString(str);
	return ICON_COLORS[hash % ICON_COLORS.length];
}

/**
 * Generate an initial avatar (letter-based icon)
 */
export function generateInitialAvatar(name: string, size: number = 48): string {
	const color = getColorFromString(name);

	// Extract initials (up to 2 characters)
	const words = name.trim().split(/\s+/);
	let initials: string;
	if (words.length >= 2) {
		initials = (words[0][0] + words[1][0]).toUpperCase();
	} else {
		initials = name.substring(0, 2).toUpperCase();
	}

	const fontSize = size * 0.4;

	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${color}" rx="8"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
          fill="white" font-family="Inter, sans-serif" font-weight="600" font-size="${fontSize}">
      ${initials}
    </text>
  </svg>`;
}

/**
 * Convert SVG string to data URL
 */
export function svgToDataUrl(svg: string): string {
	const encoded = encodeURIComponent(svg);
	return `data:image/svg+xml,${encoded}`;
}

