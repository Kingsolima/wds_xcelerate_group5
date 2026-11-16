import { z } from 'zod';
import { NEIGHBOURHOODS, POST_KINDS, VIBES, spotsOpen, type RoommatePost } from '@/data/data';

export const roommateSearchSchema = z.object({
  kind: z.enum(POST_KINDS).optional().catch(undefined),
  area: z.enum(NEIGHBOURHOODS).optional().catch(undefined),
  max: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
  tag: z
    .preprocess((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]), z.array(z.unknown()).optional())
    .transform((items) => {
      const kept = (items ?? []).filter((t): t is (typeof VIBES)[number] => VIBES.includes(t as never));
      return kept.length ? [...new Set(kept)] : undefined;
    })
    .optional()
    .catch(undefined),
});

export type RoommateSearch = z.infer<typeof roommateSearchSchema>;

export function filterPosts(posts: RoommatePost[], search: RoommateSearch) {
  return posts.filter((p) => {
    if (spotsOpen(p) === 0) return false;
    if (search.kind && p.kind !== search.kind) return false;
    if (search.area && !p.neighbourhoods.includes(search.area)) return false;
    if (search.max !== undefined && p.budget > search.max) return false;
    if (search.tag && !search.tag.every((t) => p.tags.includes(t))) return false;
    return true;
  });
}
