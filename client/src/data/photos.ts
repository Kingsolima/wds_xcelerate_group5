/*
  Stand-in photographs from Unsplash, each checked to resolve. They are placeholders for the
  photos landlords and students will upload: none of them is a real London, Ontario listing.
*/
const base = 'https://images.unsplash.com/photo-';

export const PHOTOS = {
  // Outside
  porchWhite: '1570129477492-45c003edd2be',
  duskGables: '1568605114967-8130f3a36994',
  aptDark: '1545324418-cc1a3fa10c00',
  aptBalconies: '1460317442991-0ec209397118',
  aptModern: '1515263487990-61b07816b324',
  aptBrick: '1574362848149-11496d93a7c7',
  stonePorch: '1583608205776-bfd35f0d9f83',
  brickGarage: '1605276374104-dee2a0ed3cd6',
  brickLawn: '1598228723793-52759bba239c',
  darkCottage: '1449844908441-8829872d2607',
  picketFence: '1480074568708-e7b720bb3f09',
  bungalowPorch: '1572120360610-d971b9d7767c',
  brickBungalow: '1592595896551-12b371d546d5',
  redRoof: '1576941089067-2de3c901e126',
  porchDoor: '1560184897-ae75f418493e',
  // Inside
  livingPlants: '1502672260266-1c1ef2d93688',
  livingDining: '1522708323590-d24dbb6b0267',
  livingBlueSofa: '1493809842364-78817add7ffb',
  livingOpen: '1560448204-e02f11c3d0e2',
  kitchenStools: '1484154218962-a197022b5858',
  kitchenCounter: '1556911220-bff31c812dba',
  livingArt: '1505691938895-1758d7feb511',
  bedLamp: '1522771739844-6a9f6d5f14af',
  bedOrange: '1540518614846-7eded433c457',
  greenSofa: '1555041469-a586c61ea9bc',
  yellowChair: '1586023492125-27b2c045efd7',
  livingTan: '1554995207-c18c203602cb',
  livingBeige: '1560185127-6ed189bf02f4',
  bathClassic: '1560448075-bb485b067938',
  bathPlant: '1552321554-5fefe8c9ef14',
  bathGlass: '1584622650111-993a426fbf0a',
  roomMinimal: '1513694203232-719a280e022f',
  loftShelves: '1536376072261-38c75010e6c9',
  bedGrey: '1616594039964-ae9021a400a0',
  bedWhite: '1595526114035-0d45ed16cfbf',
  roomEmpty: '1630699144867-37acec97df5a',
  livingModern: '1600607687939-ce8a6c25118c',
  livingGallery: '1600210492486-724fe5c67fb0',
  livingPopArt: '1565183997392-2f6f122e5912',
  deskTv: '1529408632839-a54952c491e5',
  livingFireplace: '1501183638710-841dd1904471',
  commonRoom: '1524758631624-e2822e304c36',
  cookingTogether: '1556909114-f6e7ad7d3136',
  livingNeutral: '1616486338812-3dadae4b4ace',
  bedTufted: '1505693416388-ac5ce068fe85',
} as const;

export type PhotoKey = keyof typeof PHOTOS;

/** The stored, size-less URL for a photo. Size it with `sized()` where it is shown. */
export function photoUrl(key: PhotoKey) {
  return base + PHOTOS[key];
}

/** Adds crop and size parameters to a stored photo URL. Other hosts are returned untouched. */
export function sized(url: string, width: number, height?: number) {
  if (!url.startsWith(base)) return url;
  const size = height ? `w=${width}&h=${height}` : `w=${width}`;
  return `${url.split('?')[0]}?auto=format&fit=crop&${size}&q=70`;
}

/** A `srcSet` covering 1x and 2x screens for a photo shown about `width` CSS pixels wide. */
export function srcSet(url: string, width: number, height?: number) {
  if (!url.startsWith(base)) return undefined;
  return [1, 2]
    .map((dpr) => `${sized(url, width * dpr, height && height * dpr)} ${dpr}x`)
    .join(', ');
}
