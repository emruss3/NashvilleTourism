import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'NASHVILLE Shop',
  description:
    'Shop the first NASHVILLE / NSH collection: elevated Nashville tees, fleece, and headwear for locals and visitors.',
  path: '/shop/',
});

const products = [
  {
    title: 'Nashville Arch Tee',
    price: '$44',
    type: 'Heavyweight Tee',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nashville-arch-tee-concept.png?v=1786041767',
    description:
      'Garment-dyed with a clean collegiate Nashville arch and the three Tennessee stars.',
  },
  {
    title: 'NSH Chest Tee',
    price: '$44',
    type: 'Premium Tee',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-chest-tee-concept.png?v=1786041775',
    description:
      'A minimal NSH USA chest mark made to feel more like a favorite local brand than a souvenir.',
  },
  {
    title: 'Nashville Skyline Tee',
    price: '$46',
    type: 'Graphic Tee',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nashville-skyline-tee-concept.png?v=1786041782',
    description:
      'A restrained line-drawn Nashville skyline across the back with city wordmark and stars.',
  },
  {
    title: 'Live Free Tee',
    price: '$46',
    type: 'Graphic Tee',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/live-free-tee-concept.png?v=1786041791',
    description:
      'Live Free. Roam Often. A road-minded NSH graphic finished with Tennessee stars.',
  },
  {
    title: 'Nashville Crewneck',
    price: '$82',
    type: 'Midweight Fleece',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nashville-crewneck-concept.png?v=1786041799',
    description:
      'A clean Nashville USA crewneck designed for everyday wear, travel, and cool Nashville nights.',
  },
  {
    title: 'NSH Hoodie',
    price: '$92',
    type: 'Premium Fleece',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-hoodie-concept.png?v=1786041807',
    description:
      'The anchor fleece piece: premium navy with a compact NSH chest mark and Tennessee stars.',
  },
  {
    title: 'Neighborhoods Tee',
    price: '$46',
    type: 'Graphic Tee',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/neighborhoods-tee-concept.png?v=1786041819',
    description:
      'A compact hit list of the Nashville neighborhoods that define the city.',
  },
  {
    title: 'NSH Hat',
    price: '$38',
    type: 'Embroidered Cap',
    image:
      'https://cdn.shopify.com/s/files/1/0732/0043/5242/files/nsh-hat-concept.png?v=1786041829',
    description:
      'A low-profile navy cap with clean NSH embroidery and the three Tennessee stars.',
  },
] as const;

export default function ShopPage() {
  return (
    <div className="shell pb-20">
      <Breadcrumbs trail={[{ name: 'Shop', href: '/shop/' }]} />
      <PageHeader
        eyebrow="NASHVILLE / NSH"
        title="The first NASHVILLE collection."
        intro="Elevated, wearable Nashville pieces designed for locals and visitors alike — city merchandise without the souvenir-shop feel."
      />

      <div className="mt-8 flex flex-col gap-3 rounded-card border border-paper-edge bg-paper-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            First drop
          </p>
          <p className="mt-1 text-[14px] leading-6 text-ink">
            The collection is live to browse now. Checkout is being connected to our print-on-demand fulfillment partner and will open as soon as each product clears production setup.
          </p>
        </div>
        <a href="/newsletter/" className="btn-secondary shrink-0 self-start sm:self-auto">
          Get drop alerts
        </a>
      </div>

      <section className="mt-10" aria-labelledby="shop-products-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Collection 01
            </p>
            <h2 id="shop-products-heading" className="mt-1 font-display text-2xl text-ink">
              Shop NASHVILLE / NSH
            </h2>
          </div>
          <p className="hidden text-[13px] text-ink-soft sm:block">8 pieces</p>
        </div>

        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article key={product.title} className="group">
              <div className="overflow-hidden rounded-card border border-paper-edge bg-paper-card">
                <div className="aspect-[4/5] overflow-hidden bg-[#eee9df]">
                  <img
                    src={product.image}
                    alt={`${product.title} from the NASHVILLE / NSH collection`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[18px] leading-tight text-ink">{product.title}</h3>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.1em] text-ink-soft">
                    {product.type}
                  </p>
                </div>
                <p className="shrink-0 text-[15px] font-semibold text-ink">{product.price}</p>
              </div>
              <p className="mt-2 text-[14px] leading-6 text-ink-soft">{product.description}</p>
              <button
                type="button"
                disabled
                className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-paper-edge px-4 py-2.5 text-[13px] font-semibold text-ink-soft opacity-75"
              >
                Checkout wiring in progress
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-card border border-paper-edge bg-paper-card px-6 py-10 text-center sm:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-soft">NASHVILLE / NSH</p>
        <h2 className="mx-auto mt-2 max-w-2xl font-display text-2xl text-ink">
          Made to be worn after the trip is over.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-ink-soft">
          We are building a tighter Nashville collection around quality blanks, restrained graphics, and pieces that belong in your normal rotation.
        </p>
        <a href="/newsletter/" className="btn-primary mt-6 inline-flex">
          Join NASHVILLE Weekender
        </a>
      </section>
    </div>
  );
}
