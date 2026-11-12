import z from 'zod';

const HeroSchema = z.object({
  primary: z.string(),
  photos: z.string().array().min(1, 'Must contain at').max(4, 'Too many photos'),
});

const TourCategorySchema = z.object({
  name: z.string(),
  description: z.string(),
  photos: z.string().array(),
  primary: z.string(),
});

const PhotoSchema = z.object({
  hero: HeroSchema,
  tour: TourCategorySchema,
});

const ListingSchema = z.object({
  name: z.string(),
  price: z.number(),
  lease: z.number(),
  address: z.string(),
  rating: z.number(),
  // rename
  housingDetails: z.object({
    beds: z.number(),
    baths: z.number(),
  }),
  photos: PhotoSchema,

  // Amenities / perks TODO: ion know how to do this
});

const data = {};
