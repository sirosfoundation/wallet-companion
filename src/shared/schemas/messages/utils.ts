import {
	type LiteralSchema,
	nullish,
	type ObjectEntries,
	object,
	pipe,
	string,
	url,
} from 'valibot';

export function defineMessage<
	TType extends LiteralSchema<string, undefined>,
	TMessage extends ObjectEntries,
	TResponse extends ObjectEntries,
>(type: TType, messageEntries: TMessage, responseEntries: TResponse) {
	const baseSchema = object({
		origin: nullish(pipe(string(), url())),
	});

	return {
		TYPE: type,
		MESSAGE: object({ type, ...baseSchema.entries, ...messageEntries }),
		RESPONSE: object(responseEntries),
		RESPONSE_SCHEMA: object({ type, response: object(responseEntries) }),
	};
}
