import type { MediaAsset } from './media-types';

/**
 * Concept imagery cut from the NSVL page-design boards (v1.7,
 * design/nsvl-brand-handoff/page-designs and references/selected-source.png).
 *
 * The owner approved using the AI pictures from the nine boards as the
 * brand and campaign imagery (AI-IMAGERY.md). Each asset is a text-free
 * region of a board, upscaled 2x and sharpened; none is a full page
 * screenshot. They never stand in for a named real restaurant, venue, hotel
 * or neighborhood: named places keep their own cleared photography or render
 * text-only, and every alt text says "illustration" so nothing reads as a
 * documentary photograph. Product renders must match the actual item before
 * a purchase flow uses them.
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
  'concept/home-social': concept('home-social', 'Illustration: four friends laughing at a patio table outside a brick café, one in a charcoal NSVL cap.', 1290, 560),
  'concept/dining-table': concept('dining-table', 'Illustration: plates of pasta and a cocktail on a shared restaurant table.', 858, 384),
  'concept/dining-bar': concept('dining-bar', 'Illustration: friends at a lively restaurant bar under warm lights.', 600, 384),
  'concept/dining-room-evening': concept('dining-room-evening', 'Illustration: a candlelit dining room with an olive tree and tables of diners.', 570, 430),
  'concept/dining-pasta': concept('dining-pasta', 'Illustration: a bowl of pasta with herbs.', 192, 186),
  'concept/dining-burger': concept('dining-burger', 'Illustration: a cheeseburger on a board.', 192, 186),
  'concept/dining-salad': concept('dining-salad', 'Illustration: a plated salad.', 192, 186),
  'concept/dining-oysters': concept('dining-oysters', 'Illustration: a plate of oysters on ice.', 206, 186),
  'concept/lunch-wine': concept('lunch-wine', 'Illustration: friends sharing a bottle of wine at a sunny lunch table.', 206, 224),
  'concept/backstage-tour': concept('backstage-tour', 'Illustration: a guide talking with visitors backstage at a historic music hall.', 1494, 634),
  'concept/food-tour-group': concept('food-tour-group', 'Illustration: a small group tasting food on a neighborhood walk.', 540, 384),
  'concept/street-cafe': concept('street-cafe', 'Illustration: friends with coffee outside a brick café on a tree-lined street.', 934, 562),
  'concept/park-couple': concept('park-couple', 'Illustration: two people walking a riverside park path with the skyline ahead.', 426, 308),
  'concept/museum-afternoon': concept('museum-afternoon', 'Illustration: visitors in a sunlit market hall.', 390, 308),
  'concept/live-music-night': concept('live-music-night', 'Illustration: a guitarist on stage over a crowd in warm stage light.', 400, 308),
  'concept/concert-crowd': concept('concert-crowd', 'Illustration: a guitarist silhouetted above a crowd, in black and white.', 864, 630),
  'concept/concert-hands': concept('concert-hands', 'Illustration: raised hands in a concert crowd under stage lights, in black and white.', 764, 200),
  'concept/hotel-room-skyline': concept('hotel-room-skyline', 'Illustration: a hotel room with a made bed facing a city skyline.', 940, 516),
  'concept/hotel-room-corner': concept('hotel-room-corner', 'Illustration: a hotel room corner with leather chairs, a bed and skyline windows.', 810, 230),
  'concept/hotel-room-lounge': concept('hotel-room-lounge', 'Illustration: a hotel suite with a leather armchair, artwork and a bed.', 810, 220),
  'concept/hotel-rooftop-terrace': concept('hotel-rooftop-terrace', 'Illustration: a rooftop terrace with sofas and lanterns overlooking the city at dusk.', 810, 220),
  'concept/apparel-model': concept('apparel-model', 'Illustration: a person in a charcoal NSVL tee walking past brick storefronts.', 900, 750, 'top'),
  'concept/apparel-cap-still': concept('apparel-cap-still', 'Illustration: a charcoal NSVL cap resting on a stone ledge beside a plant.', 768, 470),
  'concept/product-cap': concept('product-cap', 'Illustration: charcoal cap with a paper-white NSVL mark.', 500, 328),
  'concept/product-paper-tee': concept('product-paper-tee', 'Illustration: paper-white tee with a charcoal NSVL mark.', 504, 328),
  'concept/product-heavyweight-tee': concept('product-heavyweight-tee', 'Illustration: heavyweight charcoal tee with a small paper-white NSVL mark.', 504, 328),
  'concept/product-tote': concept('product-tote', 'Illustration: charcoal tote bag with a paper-white NSVL mark.', 504, 328),
  'concept/embroidery-detail': concept('embroidery-detail', 'Illustration: close-up of the NSVL mark embroidered in paper-white thread on charcoal fabric.', 844, 246),
  'concept/group-toast': concept('group-toast', 'Illustration: friends raising glasses at a rooftop dinner.', 576, 640),
  'concept/shop-still-life': concept('shop-still-life', 'Illustration: a charcoal NSVL cap on a folded paper-white NSVL tee beside a coffee mug.', 556, 444),
  'concept/friends-patio': concept('friends-patio', 'Illustration: friends laughing at a patio table on a sunny brick-lined street.', 1292, 730),
} as const satisfies Record<string, MediaAsset>;

export type ConceptKey = keyof typeof conceptMedia;
