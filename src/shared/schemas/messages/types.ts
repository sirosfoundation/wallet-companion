import type { LiteralSchema, ObjectEntries, ObjectSchema } from 'valibot';

export type Message = {
	TYPE: LiteralSchema<string, undefined>;
	MESSAGE: ObjectSchema<ObjectEntries, undefined>;
	RESPONSE: ObjectSchema<ObjectEntries, undefined>;
	RESPONSE_SCHEMA: ObjectSchema<ObjectEntries, undefined>;
};
