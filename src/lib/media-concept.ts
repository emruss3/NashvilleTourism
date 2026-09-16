import type { MediaAsset } from './media-types';

/**
 * Concept imagery cropped from the NSVL page-design boards
 * (design/nsvl-brand-handoff/page-designs, references/selected-source.png).
 *
 * These are AI-generated illustrations supplied with the brand handoff and
 * approved by the site owner for use as mood, campaign and product imagery.
 * They are never used to stand in for a specific real restaurant, venue,
 * hotel or neighborhood: named places keep their own cleared photography or
 * render text-only. Alt text says "illustration" so nothing reads as a
 * documentary photograph. Sources are 2x upscales of the board crops, so
 * the largest are shown at panel size rather than full-bleed on wide screens.
 */
const CREDIT = 'NSVL concept imagery (AI-generated illustration)';
const LICENCE = 'Owner-supplied concept board, approved for site use';

function concept(key: string, alt: string, width: number, height: number, focal: MediaAsset['focal'] = 'center'): MediaAsset {
  return {
    src: `/media/concept/${key}.jpg`,
    srcSet: `/media/concept/${key}.webp ${width}w`,
    alt,
    credit: CREDIT,
    licence: LICENCE,
    width,
    height,
    focal,
  };
}

export const conceptMedia = {
  'concept/dining-table': concept('dining-table', 'Illustration: plates of pasta and a cocktail on a shared restaurant table.', 858, 384),
  'concept/dining-bar': concept('dining-bar', 'Illustration: friends at a lively restaurant bar under warm lights.', 600, 506),
  'concept/backstage-tour': concept('backstage-tour', 'Illustration: a guide talking with visitors backstage at a historic music hall.', 1494, 634),
  'concept/food-tour-group': concept('food-tour-group', 'Illustration: a small group tasting food on a neighborhood walk.', 546, 396),
  'concept/street-cafe': concept('street-cafe', 'Illustration: friends with coffee outside a brick café on a tree-lined street.', 934, 562),
  'concept/gallery-walk': concept('gallery-walk', 'Illustration: a visitor looking at paintings in a bright gallery.', 656, 360),
  'concept/record-store': concept('record-store', 'Illustration: browsing records in a small shop.', 656, 360),
  'concept/park-couple': concept('park-couple', 'Illustration: two people walking a riverside park path with the skyline ahead.', 776, 316),
  'concept/museum-afternoon': concept('museum-afternoon', 'Illustration: visitors in a sunlit market hall.', 720, 316),
  'concept/live-music-night': concept('live-music-night', 'Illustration: a guitarist on stage over a crowd in warm stage light.', 716, 316),
  'concept/concert-crowd': concept('concert-crowd', 'Illustration: a guitarist silhouetted above a crowd, in black and white.', 864, 630),
  'concept/hotel-room-skyline': concept('hotel-room-skyline', 'Illustration: a hotel room with a made bed facing a city skyline.', 940, 516),
  'concept/hotel-morning': concept('hotel-morning', 'Illustration: a coffee cup and a book on hotel bed linen.', 660, 228),
  'concept/rooftop-lounge': concept('rooftop-lounge', 'Illustration: a rooftop lounge at dusk with the city behind.', 656, 228),
  'concept/hotel-room-lounge': concept('hotel-room-lounge', 'Illustration: a rooftop terrace with sofas and skyline views.', 824, 236),
  'concept/apparel-model': concept('apparel-model', 'Illustration: a person in a charcoal NSVL tee walking past brick storefronts.', 900, 750, 'top'),
  'concept/apparel-cap-still': concept('apparel-cap-still', 'Illustration: a charcoal NSVL cap resting on a stone ledge beside a plant.', 768, 470),
  'concept/product-cap': concept('product-cap', 'Illustration: charcoal cap with a paper-white NSVL mark.', 500, 328),
  'concept/product-paper-tee': concept('product-paper-tee', 'Illustration: paper-white tee with a charcoal NSVL mark.', 504, 328),
  'concept/product-heavyweight-tee': concept('product-heavyweight-tee', 'Illustration: heavyweight charcoal tee with a small paper-white NSVL mark.', 504, 328),
  'concept/embroidery-detail': concept('embroidery-detail', 'Illustration: close-up of the NSVL mark embroidered in paper-white thread on charcoal fabric.', 844, 246),
  'concept/group-toast': concept('group-toast', 'Illustration: friends raising glasses at a rooftop dinner.', 576, 640),
  'concept/shop-still-life': concept('shop-still-life', 'Illustration: a charcoal NSVL cap on a folded paper-white NSVL tee beside a coffee mug.', 556, 444),
  'concept/friends-patio': concept('friends-patio', 'Illustration: friends laughing at a patio table on a sunny brick-lined street.', 1292, 730),
} as const satisfies Record<string, MediaAsset>;

export type ConceptKey = keyof typeof conceptMedia;
