export type FormatForWallet = {
	protocol: string;
	walletUrl: string;
} & Record<string, unknown>;

/**
 * Base Protocol Plugin Interface
 * All protocol plugins must implement these methods
 */
export abstract class ProtocolPlugin {
	/**
	 * Get the protocol identifier
	 * @returns {string} Protocol identifier (e.g., 'openid4vp', 'mdoc-openid4vp')
	 */
	abstract getProtocolId(): string;

	/**
	 * Validate and prepare request data for this protocol
	 * @param requestData - Raw request data from navigator.credentials.get
	 * @returns Validated and formatted request data
	 */
	abstract prepareRequest(requestData: unknown): unknown;

	/**
	 * Validate response data from wallet
	 * @param responseData - Response data from wallet
	 * @returns Validated response data
	 */
	abstract validateResponse(responseData: unknown): unknown;

	/**
	 * Format the request for transmission to the wallet
	 * @param preparedRequest - Output from prepareRequest()
	 * @param walletUrl - Target wallet URL
	 * @returns Request ready for transmission
	 */
	formatForWallet(preparedRequest: unknown, walletUrl: string): FormatForWallet {
		return {
			protocol: this.getProtocolId(),
			data: preparedRequest,
			walletUrl: walletUrl,
		};
	}
}

/**
 * Example Protocol Plugin Implementation
 */
export class ExampleProtocolPlugin extends ProtocolPlugin {
	getProtocolId() {
		return 'example-protocol';
	}

	prepareRequest(requestData: unknown) {
		if (!requestData || typeof requestData !== 'object') {
			throw new Error('Request data must be an object');
		}

		return {
			...requestData,
			timestamp: new Date().toISOString(),
		};
	}

	validateResponse(responseData: unknown) {
		if (!responseData || typeof responseData !== 'object') {
			throw new Error('Invalid response data');
		}

		return responseData;
	}
}
