/**
 * @param {string} input
 * @returns {string}
 */
export function base64urlEncode(input) {
	return new TextEncoder()
		.encode(input)
		.toBase64({
			alphabet: 'base64url',
			omitPadding: true,
		});
}

/**
 * @param {string} input
 * @returns {string}
 */
export function base64urlDecode(input) {
	return new TextDecoder().decode(
		Uint8Array.fromBase64(input, {
			alphabet: 'base64url',
			omitPadding: true,
		}),
	);
}
