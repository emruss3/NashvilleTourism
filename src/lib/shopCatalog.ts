export type ShopVariant = {
  id: string;
  title: string;
  price: string;
};

export type LogoOverlay = {
  left: string;
  top: string;
  width: string;
  opacity?: number;
};

export type ShopProduct = {
  productId: string;
  handle: string;
  title: string;
  priceLabel: string;
  type: string;
  collection: 'Core' | 'Drop 001' | 'Graphic Seasonal' | 'Home & Lifestyle';
  image: string;
  description: string;
  variants: ShopVariant[];
  logoOverlay?: LogoOverlay;
};

export const shopifyStoreDomain =
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  process.env.SHOPIFY_STORE_DOMAIN ||
  'nashroam.myshopify.com';

export const shopProducts: ShopProduct[] = [
  {
    productId: 'gid://shopify/Product/8001476886570',
    handle: 'tristar-heavyweight-tee',
    title: 'Tristar Heavyweight Tee',
    priceLabel: '$52–$54',
    type: 'Comfort Colors 1717 · Faded Navy',
    collection: 'Core',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-tristar-heavyweight-tee-concept.png?v=1787774786',
    description:
      'A quiet cream Tennessee tristar at the left chest with a small collegiate Nashville, TN back-neck hit.',
    variants: [
      { id: '44751271755818', title: 'S', price: '$52' },
      { id: '44751271788586', title: 'M', price: '$52' },
      { id: '44751271821354', title: 'L', price: '$52' },
      { id: '44751271854122', title: 'XL', price: '$52' },
      { id: '44751271886890', title: '2XL', price: '$54' },
    ],
  },
  {
    productId: 'gid://shopify/Product/8001476984874',
    handle: 'hot-chicken-check-tee',
    title: 'Hot Chicken Check Tee',
    priceLabel: '$52–$54',
    type: 'Garment-dyed Tee · Cream',
    collection: 'Graphic Seasonal',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-hot-chicken-check-tee-concept.png?v=1787774796',
    description:
      'A cayenne checkerboard band and wide-set collegiate Nashville. The local reference lives in the name, not a cartoon.',
    variants: [
      { id: '44751273525290', title: 'S', price: '$52' },
      { id: '44751273558058', title: 'M', price: '$52' },
      { id: '44751273590826', title: 'L', price: '$52' },
      { id: '44751273623594', title: 'XL', price: '$52' },
      { id: '44751273656362', title: '2XL', price: '$54' },
    ],
  },
  {
    productId: 'gid://shopify/Product/8001477050410',
    handle: 'two-tone-blue-tee',
    title: 'Two-Tone Blue Tee',
    priceLabel: '$52–$54',
    type: 'Heavyweight Tee · Navy',
    collection: 'Drop 001',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-two-tone-blue-tee-concept.png?v=1787774805',
    description:
      'The two blues Nashville wears on Sundays, expressed as color and type without licensed team marks.',
    variants: [
      { id: '44751273721898', title: 'S', price: '$52' },
      { id: '44751273754666', title: 'M', price: '$52' },
      { id: '44751273787434', title: 'L', price: '$52' },
      { id: '44751273820202', title: 'XL', price: '$52' },
      { id: '44751273852970', title: '2XL', price: '$54' },
    ],
  },
  {
    productId: 'gid://shopify/Product/8001477083178',
    handle: 'two-tone-blue-trucker',
    title: 'Two-Tone Blue Trucker',
    priceLabel: '$42',
    type: 'Richardson 112 · Navy / Columbia',
    collection: 'Drop 001',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-two-tone-blue-trucker-concept.png?v=1787774814',
    description:
      'A trusted trucker shape in Sunday colors with flat cream tristar embroidery and a tiny optional 001 side stitch.',
    variants: [{ id: '44751273885738', title: 'One size', price: '$42' }],
  },
  {
    productId: 'gid://shopify/Product/8001477181482',
    handle: 'tristar-dad-cap',
    title: 'Tristar Dad Cap',
    priceLabel: '$38',
    type: 'Unstructured 6-panel',
    collection: 'Core',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-tristar-dad-cap-concept.png?v=1787774826',
    description:
      'The everyday cap: a quiet, tone-adjacent tristar that reads at three feet and disappears at ten.',
    variants: [
      { id: '44751273984042', title: 'Washed Black', price: '$38' },
      { id: '44751274016810', title: 'Stone', price: '$38' },
    ],
  },
  {
    productId: 'gid://shopify/Product/8001477214250',
    handle: 'blackout-ball-cap',
    title: 'Blackout Ball Cap',
    priceLabel: '$38',
    type: 'Black / Black',
    collection: 'Core',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-blackout-ball-cap-concept.png?v=1787774836',
    description:
      'Black-on-black NSH embroidery with one restrained clay-coral flash under the brim. Nothing else.',
    variants: [{ id: '44751274049578', title: 'One size', price: '$38' }],
    logoOverlay: { left: '43.5%', top: '36.5%', width: '13%', opacity: 0.16 },
  },
  {
    productId: 'gid://shopify/Product/8001477312554',
    handle: 'the-neighborhoods-map-print',
    title: 'The Neighborhoods Map Print',
    priceLabel: '$38–$58',
    type: 'Matte Art Print',
    collection: 'Home & Lifestyle',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-neighborhoods-map-print-concept.png?v=1787774848',
    description:
      'A restrained line-art map organized around the Cumberland River and the neighborhoods that give central Nashville its identity.',
    variants: [
      { id: '44751274278954', title: '12 × 16', price: '$38' },
      { id: '44751274311722', title: '18 × 24', price: '$58' },
    ],
  },
  {
    productId: 'gid://shopify/Product/8001477443626',
    handle: 'nsh-dog-bandana',
    title: 'NSH Dog Bandana',
    priceLabel: '$24–$26',
    type: 'Porch Cream / Navy',
    collection: 'Home & Lifestyle',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-dog-bandana-concept.png?v=1787774861',
    description:
      'Porch Cream with a navy border and a small repeating tristar field, finished with the official NSH mark at the tie corner.',
    variants: [
      { id: '44751274868778', title: 'S / M', price: '$24' },
      { id: '44751274901546', title: 'L / XL', price: '$26' },
    ],
    logoOverlay: { left: '45.5%', top: '66%', width: '9%', opacity: 1 },
  },
  {
    productId: 'gid://shopify/Product/8001476263978',
    handle: 'nsh-weekender',
    title: 'NSH Weekender',
    priceLabel: '$128',
    type: 'Structured Canvas Duffel',
    collection: 'Home & Lifestyle',
    image: 'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-weekender-concept.png?v=1787774871',
    description:
      'The hero piece: navy structured canvas, tan handles, brass hardware, and the NSH mark placed on the end panel—not the broad face.',
    variants: [{ id: '44751268479018', title: '40–50L', price: '$128' }],
    logoOverlay: { left: '74.5%', top: '47.5%', width: '10%', opacity: 1 },
  },
];
