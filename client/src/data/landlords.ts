import type { Landlord } from './data';

// Fictional landlords. Any resemblance to a real London, Ontario company is accidental.
export const landlords: Landlord[] = [
  {
    id: 'maple-row',
    name: 'Maple Row Properties',
    kind: 'company',
    about: 'Manages eleven houses in Broughdale and Old North, most of them five and six bedrooms.',
    since: 2009,
  },
  {
    id: 'theresa-vo',
    name: 'Theresa Vo',
    kind: 'individual',
    about: 'Rents out two semi-detached houses she grew up near. Lives ten minutes away.',
    since: 2016,
  },
  {
    id: 'thames-living',
    name: 'Thames Living',
    kind: 'company',
    about: 'Purpose-built student apartments downtown and on Richmond Row, with front desks.',
    since: 2014,
  },
  {
    id: 'g-patel',
    name: 'Gurpreet Patel',
    kind: 'individual',
    about: 'Owns three townhouses in Cherryhill and handles repairs himself.',
    since: 2012,
  },
  {
    id: 'northgate',
    name: 'Northgate Rentals',
    kind: 'company',
    about: 'A larger portfolio across Masonville and University Heights, with an online repair portal.',
    since: 2004,
  },
  {
    id: 'ana-silva',
    name: 'Ana Silva',
    kind: 'individual',
    about: 'Rents the upper floor of her house in Oxford Park to one or two students a year.',
    since: 2019,
  },
];
