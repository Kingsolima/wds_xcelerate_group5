/** The opening view, then one stop per thing the product does. Kept apart from the scene so the page can use it without loading three.js. */
export const CHAPTERS = ['suite', 'reviews', 'sublets', 'housemates', 'verified'] as const;
export type ChapterId = (typeof CHAPTERS)[number];
