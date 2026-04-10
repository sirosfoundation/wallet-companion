/**
 * Pollyfill for the `chrome.runtime.MessageSender` type,
 * which has some optional properties that are not always
 * present in all contexts (e.g. `tab` is not present in service workers).
 * This type is used in message handlers to provide better
 * type safety while accounting for the variability of the `MessageSender`
 * object across different contexts.
 * See: https://developer.chrome.com/docs/extensions/reference/runtime/#type-MessageSender
 */
export interface MessageSenderCompat {
	tab?: { id?: number };
	frameId?: number;
}
