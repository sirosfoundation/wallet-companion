import { UsageStatsSchema } from '@shared/schemas/resources';
import { type InferOutput, literal, variant } from 'valibot';
import { defineMessage } from './utils';

/**
 * Message types sent FROM the background script
 * (to popup and options pages).
 */
export enum OutboundMessages {
	STATS_UPDATE = 'STATS_UPDATE',
}

export type StatsUpdateMessage = InferOutput<typeof StatsUpdate.MESSAGE>;
export const StatsUpdate = defineMessage(
	literal(OutboundMessages.STATS_UPDATE),
	{
		stats: UsageStatsSchema,
	},
	{},
);

const registry = {
	[OutboundMessages.STATS_UPDATE]: StatsUpdate,
};

export const OutboundMessageSchema = variant(
	'type',
	Object.values(registry).map(({ MESSAGE }) => MESSAGE),
);
export type OutboundMessage = InferOutput<typeof OutboundMessageSchema>;
