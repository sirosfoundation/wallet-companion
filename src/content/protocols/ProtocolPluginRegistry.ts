import { ExampleProtocolPlugin, ProtocolPlugin } from './ProtocolPlugin';

/**
 * Protocol Plugin Registry
 * Manages registration and retrieval of protocol plugins
 */
export class ProtocolPluginRegistry {
	private readonly plugins: Map<string, ProtocolPlugin> = new Map();

	constructor() {
		this.register(new ExampleProtocolPlugin());
	}

	/**
	 * Register a protocol plugin
	 */
	register(plugin: ProtocolPlugin) {
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
	 */
	getPlugin(protocolId: string): ProtocolPlugin | null {
		return this.plugins.get(protocolId) ?? null;
	}

	/**
	 * Check if a protocol is supported
	 */
	isSupported(protocolId: string): boolean {
		return this.plugins.has(protocolId);
	}

	/**
	 * Get all supported protocol IDs
	 */
	getSupportedProtocols(): string[] {
		return Array.from(this.plugins.keys());
	}

	/**
	 * Process a request using the appropriate plugin
	 */
	prepareRequest(protocolId: string, requestData: unknown): unknown {
		const plugin = this.getPlugin(protocolId);
		if (!plugin) {
			throw new Error(`No plugin registered for protocol: ${protocolId}`);
		}
		return plugin.prepareRequest(requestData);
	}

	/**
	 * Validate a response using the appropriate plugin
	 */
	validateResponse(protocolId: string, responseData: unknown): unknown {
		const plugin = this.getPlugin(protocolId);
		if (!plugin) {
			throw new Error(`No plugin registered for protocol: ${protocolId}`);
		}
		return plugin.validateResponse(responseData);
	}

	/**
	 * Format a request for wallet transmission
	 */
	formatForWallet(protocolId: string, preparedRequest: unknown, walletUrl: string): unknown {
		const plugin = this.getPlugin(protocolId);
		if (!plugin) {
			throw new Error(`No plugin registered for protocol: ${protocolId}`);
		}
		return plugin.formatForWallet(preparedRequest, walletUrl);
	}
}
