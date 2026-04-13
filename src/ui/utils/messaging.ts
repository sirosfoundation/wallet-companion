import { type MessageSender, runtimeOnMessage, runtimeSendMessage } from '@shared/runtime';
import type { OutboundMessage } from '@shared/schemas/messages';
import type { InboundMessage, ResponseFor } from '@shared/schemas/messages/inbound';

/**
 * Sends a message to the background script and returns the response.
 */
export async function sendMessage<M extends InboundMessage>(
	message: M,
): Promise<ResponseFor<M['type']>> {
	return runtimeSendMessage(message) as Promise<ResponseFor<M['type']>>;
}

/**
 * Listens for messages from the background script.
 */
export async function onMessage(
	listener: (message: OutboundMessage, sender: MessageSender) => void,
): Promise<void> {
	return runtimeOnMessage(listener) as Promise<void>;
}
