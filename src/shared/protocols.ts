/**
 * @fileoverview
 * Protocols supported by the extension and registered wallets.
 * Re-exports protocol constants from @sirosfoundation/dc-api.
 */

import {
	OID4VP_PROTOCOLS,
	OID4VP_ALL_PROTOCOLS,
	isOID4VPProtocol,
	type OID4VPProtocol,
} from '@sirosfoundation/dc-api';

/**
 * OpenID4VP protocol variants supported by the extension and wallets.
 * Re-exported from @sirosfoundation/dc-api for backward compatibility.
 */
export const OpenID4VPProtocols = OID4VP_PROTOCOLS;

/** Type alias so `import type { OpenID4VPProtocols }` still resolves. */
export type OpenID4VPProtocols = OID4VPProtocol;

export type Protocol = OID4VPProtocol;

export function protocolsToArray() {
	return [...OID4VP_ALL_PROTOCOLS];
}

export const isProtocol = isOID4VPProtocol;
