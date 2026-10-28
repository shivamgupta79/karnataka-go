import { z } from "zod";

// Must match INTERESTS in PlannerForm.tsx
const VALID_INTERESTS = [
  "heritage","temples","forts","ruins","sculpture","royal",
  "nature","trekking","adventure","waterfalls","caves","geology",
  "wildlife","birdwatching",
  "beaches","backpacking",
  "spiritual","yoga",
  "food","coffee","rural",
  "folk-arts","festivals","culture","tribal",
  "photography","museums","shopping",
] as const;

export const PrefsSchema = z.object({
  days: z.number().int().min(1).max(10),
  budget: z.number().min(1000).max(5_000_000),
  travellers: z.number().int().min(1).max(12),
  interests: z.array(z.string()).max(30),   // keep loose — unknown tags just score 0
  group: z.enum(["solo", "couple", "family", "friends", "women"]),
  pace: z.enum(["relaxed", "packed"]),
  transport: z.enum(["car", "bike", "bus", "train", "taxi", "mix"]),
  month: z.number().int().min(1).max(12),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  language: z.string().max(30),
  startPoint: z.string().max(80).optional(),
  endPoint: z.string().max(80).optional(),
});

// Export for reference
export { VALID_INTERESTS };
