/** A valid sublet request body. Override any field. */
export function sampleListing(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'sublet',
    type: 'room',
    name: 'Summer room near campus',
    description: 'Furnished room, May to August.',
    price: 650,
    lease: 4,
    address: 'Huron St, Broughdale',
    neighbourhood: 'Broughdale',
    housingDetails: { beds: 4, baths: 1.5, roomsOpen: 1 },
    walkMinutes: 8,
    busMinutes: 5,
    groceryMinutes: 10,
    availableFrom: '2027-05-01',
    availableTo: '2027-08-31',
    furnished: true,
    utilitiesIncluded: false,
    amenities: ['laundry', 'wifi'],
    photos: {
      hero: { primary: 'a.jpg', photos: ['a.jpg'] },
      tour: { name: 'Bedroom', description: 'Bright', photos: ['b.jpg'], primary: 'b.jpg' },
    },
    ...overrides,
  };
}
