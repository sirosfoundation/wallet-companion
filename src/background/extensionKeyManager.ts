/**
 * ExtensionKeyManager — manages a P-256 attestation key in the browser extension.
 *
 * This key is used for WIA Tier 2 (extension-attested): the extension signs
 * a challenge from wallet-frontend to prove the credential request originated
 * from a legitimate browser extension instance.
 *
 * Key storage: chrome.storage.session (cleared on browser close — ephemeral).
 * The key is generated on first use per browser session.
 */

interface StoredKeyPair {
	publicKeyJwk: JsonWebKey;
	privateKeyJwk: JsonWebKey;
	kid: string;
	createdAt: string;
}

const STORAGE_KEY = 'extension_attestation_key';

/**
 * Get or generate the extension attestation key pair.
 * Uses session storage (ephemeral per browser session).
 */
export async function getOrCreateAttestationKey(): Promise<{
	kid: string;
	publicKeyJwk: JsonWebKey;
}> {
	const existing = await loadKey();
	if (existing) {
		return { kid: existing.kid, publicKeyJwk: existing.publicKeyJwk };
	}

	const keyPair = await generateAndStoreKey();
	return { kid: keyPair.kid, publicKeyJwk: keyPair.publicKeyJwk };
}

/**
 * Sign a WIA challenge with the extension's attestation key.
 *
 * The challenge is typically a nonce from the wallet backend's WIA endpoint.
 * Returns a compact JWS (ES256) that the wallet-frontend includes in the
 * WIA generation request to prove extension attestation.
 */
export async function signWiaChallenge(challenge: string): Promise<string> {
	const stored = await loadKey();
	if (!stored) {
		throw new Error('Extension attestation key not initialized');
	}

	const privateKey = await crypto.subtle.importKey(
		'jwk',
		stored.privateKeyJwk,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign'],
	);

	// Build compact JWS: header.payload.signature
	const { d: _, ...publicJwk } = stored.publicKeyJwk;
	const header = base64UrlEncode(
		JSON.stringify({
			alg: 'ES256',
			typ: 'extension-attestation+jwt',
			kid: stored.kid,
			jwk: publicJwk,
		}),
	);

	const payload = base64UrlEncode(
		JSON.stringify({
			challenge,
			iat: Math.floor(Date.now() / 1000),
			iss: 'urn:siros:wallet-companion',
		}),
	);

	const signingInput = `${header}.${payload}`;
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		privateKey,
		new TextEncoder().encode(signingInput),
	);

	return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Get the public key JWK for the extension attestation key.
 * Returns null if no key exists yet.
 */
export async function getAttestationPublicKey(): Promise<JsonWebKey | null> {
	const stored = await loadKey();
	if (!stored) return null;
	const { d: _, ...publicJwk } = stored.publicKeyJwk;
	return publicJwk;
}

// ── Internal helpers ────────────────────────────────────────────────

async function generateAndStoreKey(): Promise<StoredKeyPair> {
	const { publicKey, privateKey } = await crypto.subtle.generateKey(
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign', 'verify'],
	);

	const publicKeyJwk = await crypto.subtle.exportKey('jwk', publicKey);
	const privateKeyJwk = await crypto.subtle.exportKey('jwk', privateKey);

	// Compute JWK Thumbprint (SHA-256) as kid
	const thumbprintInput = JSON.stringify({
		crv: publicKeyJwk.crv,
		kty: publicKeyJwk.kty,
		x: publicKeyJwk.x,
		y: publicKeyJwk.y,
	});
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(thumbprintInput),
	);
	const kid = base64UrlEncode(digest);

	const stored: StoredKeyPair = {
		publicKeyJwk,
		privateKeyJwk,
		kid,
		createdAt: new Date().toISOString(),
	};

	await saveKey(stored);
	return stored;
}

async function loadKey(): Promise<StoredKeyPair | null> {
	const storage = getSessionStorage();
	if (!storage) return null;

	const result = await storage.get(STORAGE_KEY);
	const data = result[STORAGE_KEY];
	if (!data || typeof data !== 'object') return null;
	return data as StoredKeyPair;
}

async function saveKey(keyPair: StoredKeyPair): Promise<void> {
	const storage = getSessionStorage();
	if (!storage) {
		console.warn('Session storage not available — attestation key will not persist');
		return;
	}
	await storage.set({ [STORAGE_KEY]: keyPair });
}

function getSessionStorage(): chrome.storage.SessionAccessLevel | null {
	// chrome.storage.session is MV3-only, available in service workers
	if (typeof chrome !== 'undefined' && chrome.storage?.session) {
		return chrome.storage.session as any;
	}
	// Firefox MV3 fallback — use local storage (not ideal but functional)
	if (typeof browser !== 'undefined' && (browser as any).storage?.local) {
		return (browser as any).storage.local;
	}
	return null;
}

function base64UrlEncode(input: string | ArrayBuffer): string {
	const bytes =
		typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
