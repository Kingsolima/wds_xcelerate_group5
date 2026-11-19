import { queryOptions } from '@tanstack/react-query';
import { api } from './api';

// Shared by route loaders (prefetch) and components (read), so both hit the same cache entry.

export const listingsQueryOptions = () =>
  queryOptions({ queryKey: ['listings'], queryFn: api.getListings });

export const listingQueryOptions = (listingId: string) =>
  queryOptions({ queryKey: ['listings', listingId], queryFn: () => api.getListing(listingId) });

export const reviewsQueryOptions = () =>
  queryOptions({ queryKey: ['reviews'], queryFn: api.getReviews });

export const landlordsQueryOptions = () =>
  queryOptions({ queryKey: ['landlords'], queryFn: api.getLandlords });

export const landlordQueryOptions = (landlordId: string) =>
  queryOptions({ queryKey: ['landlords', landlordId], queryFn: () => api.getLandlord(landlordId) });

export const roommatePostsQueryOptions = () =>
  queryOptions({ queryKey: ['roommates'], queryFn: api.getRoommatePosts });

/** The signed-in user, or null. Invalidate ['me'] after signing in or out. */
export const meQueryOptions = () =>
  queryOptions({ queryKey: ['me'], queryFn: api.getMe, staleTime: 5 * 60_000 });
