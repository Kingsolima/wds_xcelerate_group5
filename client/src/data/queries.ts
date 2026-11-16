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
