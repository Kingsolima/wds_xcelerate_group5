
import { z } from 'zod';

// Validates the ID of a group or housing listing.
export const GroupId = z.uuid();

// Validates the information needed to create a roommate group.
export const GroupInput = z.object({
  listingId: z.uuid(),
  capacity: z.number().int().min(1).max(20),
}).strict();

// TypeScript type inferred from the validation schema.
export type GroupInput = z.infer<typeof GroupInput>;
