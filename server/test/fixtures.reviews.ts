/** A valid POST /api/listings/:id/reviews body. Pass overrides to change fields. */
export function sampleReview(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    authorDetail: '3rd-year Kinesiology',
    livedThere: '2025–26',
    rating: 4,
    scores: { landlord: 5, condition: 4, value: 3, quiet: 4 },
    title: 'Good spot, close to campus',
    body: 'The landlord fixed things quickly. A bit loud on weekends.',
    ...overrides,
  };
}
