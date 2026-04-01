/**
 * Protocol Plugin Architecture for Digital Credentials API
 * Handles protocol-specific request formatting and response parsing
 */

/**
 * Base Protocol Plugin Interface
 * All protocol plugins must implement these methods
 */
export class ProtocolPlugin {
	/**
	 * Get the protocol identifier
	 * @returns {string} Protocol identifier (e.g., 'openid4vp', 'mdoc-openid4vp')
	 */
	getProtocolId() {
		throw new Error('getProtocolId() must be implemented');
	}

	/**
	 * Validate and prepare request data for this protocol
	 * @param {Object} requestData - Raw request data from navigator.credentials.get
	 * @returns {Object} Validated and formatted request data
	 */
	prepareRequest(_requestData) {
		throw new Error('prepareRequest() must be implemented');
	}

	/**
	 * Validate response data from wallet
	 * @param {Object} responseData - Response data from wallet
	 * @returns {Object} Validated response data
	 */
	validateResponse(_responseData) {
		throw new Error('validateResponse() must be implemented');
	}

	/**
	 * Format the request for transmission to the wallet
	 * @param {Object} preparedRequest - Output from prepareRequest()
	 * @param {string} walletUrl - Target wallet URL
	 * @returns {Object} Request ready for transmission
	 */
	formatForWallet(preparedRequest, walletUrl) {
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

	prepareRequest(requestData) {
		if (!requestData || typeof requestData !== 'object') {
			throw new Error('Request data must be an object');
		}

		return {
			...requestData,
			timestamp: new Date().toISOString(),
		};
	}

	validateResponse(responseData) {
		if (!responseData || typeof responseData !== 'object') {
			throw new Error('Invalid response data');
		}

		return responseData;
	}
}

/**
 * Protocol Plugin Registry
 * Manages registration and retrieval of protocol plugins
 */
export class ProtocolPluginRegistry {
	constructor() {
		this.plugins = new Map();

		this.register(new ExampleProtocolPlugin());
	}

	/**
	 * Register a protocol plugin
	 * @param {ProtocolPlugin} plugin - Plugin instance
	 */
	register(plugin) {
		if (!(plugin instanceof ProtocolPlugin)) {
			throw new Error('Plugin must extend ProtocolPlugin');
		}

		const protocolId = plugin.getProtocolId();
		if (this.plugins.has(protocolId)) {
			console.warn(`Protocol plugin for '${protocolId}' is being replaced`);
		}

		this.plugins.set(protocolId, plugin);
		console.log(`Registered protocol plugin: ${protocolId}`);
	}

	/**
	 * Get a protocol plugin by ID
	 * @param {string} protocolId - Protocol identifier
	 * @returns {ProtocolPlugin|null} Plugin instance or null
	 */
	getPlugin(protocolId) {
		return this.plugins.get(protocolId) || null;
	}

	/**
	 * Check if a protocol is supported
	 * @param {string} protocolId - Protocol identifier
	 * @returns {boolean} True if protocol is supported
	 */
	isSupported(protocolId) {
		return this.plugins.has(protocolId);
	}

	/**
	 * Get all supported protocol IDs
	 * @returns {string[]} Array of protocol IDs
	 */
	getSupportedProtocols() {
		return Array.from(this.plugins.keys());
	}

	/**
	 * Process a request using the appropriate plugin
	 * @param {string} protocolId - Protocol identifier
	 * @param {Object} requestData - Request data
	 * @returns {Object} Prepared request
	 */
	prepareRequest(protocolId, requestData) {
		const plugin = this.getPlugin(protocolId);
		if (!plugin) {
			throw new Error(`No plugin registered for protocol: ${protocolId}`);
		}

		return plugin.prepareRequest(requestData);
	}

	/**
	 * Validate a response using the appropriate plugin
	 * @param {string} protocolId - Protocol identifier
	 * @param {Object} responseData - Response data
	 * @returns {Object} Validated response
	 */
	validateResponse(protocolId, responseData) {
		const plugin = this.getPlugin(protocolId);
		if (!plugin) {
			throw new Error(`No plugin registered for protocol: ${protocolId}`);
		}

		return plugin.validateResponse(responseData);
	}

	/**
	 * Format a request for wallet transmission
	 * @param {string} protocolId - Protocol identifier
	 * @param {Object} preparedRequest - Prepared request data
	 * @param {string} walletUrl - Wallet URL
	 * @returns {Object} Formatted request
	 */
	formatForWallet(protocolId, preparedRequest, walletUrl) {
		const plugin = this.getPlugin(protocolId);
		if (!plugin) {
			throw new Error(`No plugin registered for protocol: ${protocolId}`);
		}

		return plugin.formatForWallet(preparedRequest, walletUrl);
	}
}
