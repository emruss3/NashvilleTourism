import { Breadcrumbs, Chip, EmptyState, ErrorState, FactTable, LoadingState, PageHeader, SectionHeader } from '@/components/Ui';
import { AffiliateDisclosure, PlacementLabel, VerificationBadge } from '@/components/Trust';
import { EventCard, GuideCard, HotelCard, NeighborhoodCard, RestaurantCard } from '@/components/Cards';
import { guides, hotels, neighborhoods, restaurants, upcomingEvents } from '@/lib/content';
import { asset, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Style guide',
  description: 'Typography, color, spacing, buttons, cards, forms, and trust components used across the site.',
  path: '/style-guide/',
  noindex: true,
});

const SWATCHES = [
  ['Porch Cream', 'bg-paper', '#F8F3E9', 'Page background'],
  ['Soft White', 'bg-paper-card', '#FFFDFC', 'Cards'],
  ['Sky Wash', 'bg-sky', '#DDECEF', 'Component accents only'],
  ['Dogwood Pink', 'bg-dogwood', '#F2B7AE', 'Badges and chips only'],
  ['Nashville Navy', 'bg-ink', '#102A43', 'Logo, nav, headings'],
  ['Cumberland Blue', 'bg-cumberland', '#214A72', 'Inverse section — one per page maximum'],
  ['Clay Coral', 'bg-clay', '#D95D45', 'Primary CTAs'],
  ['Park Mint', 'bg-mint', '#8FC4AD', 'Positive / verified'],
  ['Golden Hour', 'bg-golden', '#E8B64A', 'Warm highlight'],
  ['Charcoal', 'bg-ink-body', '#232323', 'Body copy'],
];

export default function StyleGuidePage() {
  return (
    <div className="shell pb-20">
      <Breadcrumbs trail={[{ name: 'Style guide', href: '/style-guide/' }]} />
      <PageHeader
        eyebrow="Design system"
        title="Style guide"
        intro="The components and tokens this site is built from. Use these rather than creating one-off styles."
      />

      {/* Typography */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader
          title="Typography"
          description="Logo is an image asset. Playfair Display for H1/H2. Inter for H3, navigation, buttons, forms, cards, and body."
        />
        <div className="space-y-4 rounded-card border border-paper-edge bg-paper-card p-6">
          <p className="font-display text-4xl font-bold leading-tight">H1 — Playfair Display Bold</p>
          <p className="font-display text-3xl font-semibold leading-tight">H2 — Playfair Display Semibold</p>
          <p className="font-sans text-2xl font-bold leading-tight">H3 — Inter Bold</p>
          <p className="font-sans text-base font-semibold">Buttons / nav — Inter Semibold</p>
          <p className="eyebrow">Labels — Inter Bold, uppercase sparingly</p>
          <p className="max-w-prose text-[17px] font-normal leading-relaxed text-ink-body">
            Body — Inter Regular at 17px, charcoal. Secondary text uses ink soft.
          </p>
          <p className="text-sm font-medium text-ink-faint">Metadata — Inter Medium, ink faint.</p>
        </div>
      </section>

      {/* Logos */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader
          title="Logo system"
          description="Actual cropped assets from the brand sheet in /public/brand/. Never recreate with web fonts."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Primary wordmark', '/brand/wordmark.png', 'Header, footer'],
            ['Campaign horizontal', '/brand/lockup-horizontal.png', 'Promo / campaign'],
            ['Campaign stacked', '/brand/lockup-stacked.png', 'Hero, vertical spaces'],
            ['NSH mark', '/brand/nsh.png', 'Shop, compact chrome'],
            ['Star mark', '/brand/star.png', 'Favicon, accents'],
          ].map(([label, src, use]) => (
            <div key={src} className="rounded-card border border-paper-edge bg-paper-card p-5">
              <div className="flex h-28 items-center justify-center rounded bg-paper p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(src)} alt={label} className="max-h-full w-auto object-contain" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
              <p className="text-2xs text-ink-faint">{use}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Color */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Color" description="Light-first palette: Porch Cream and Soft White dominant, navy as anchor, Clay Coral for commerce." />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map(([name, cls, hex, use]) => (
            <div key={name} className="rounded-card border border-paper-edge bg-white p-3">
              <div className={`${cls} h-14 w-full rounded border border-paper-edge`} />
              <p className="mt-2 text-sm font-semibold text-ink">{name}</p>
              <p className="text-2xs text-ink-faint">{hex}</p>
              <p className="text-2xs text-ink-faint">{use}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Spacing" description="A 4px base scale. Sections use 40 to 64px of vertical rhythm." />
        <div className="space-y-2 rounded-card border border-paper-edge bg-white p-6">
          {[1, 2, 3, 4, 6, 8, 10, 12, 16].map((n) => (
            <div key={n} className="flex items-center gap-4">
              <span className="w-16 text-sm text-ink-faint">{n * 4}px</span>
              <div className="h-3 bg-clay/25" style={{ width: `${n * 4}px` }} />
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Buttons" />
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-paper-edge bg-paper-card p-6">
          <button type="button" className="btn-primary">Primary — Clay Coral</button>
          <button type="button" className="btn-secondary">Secondary — Navy</button>
          <button type="button" className="btn-tertiary">Tertiary — outline</button>
          <button type="button" className="btn-positive">Positive — Mint</button>
          <button type="button" className="btn-quiet">Quiet</button>
        </div>
      </section>

      {/* Forms */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Forms" description="Every input has a visible label. Errors use role=alert and are announced." />
        <div className="grid max-w-2xl gap-5 rounded-card border border-paper-edge bg-white p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="sg-text" className="field-label">Text input</label>
            <input id="sg-text" className="field-input" placeholder="Placeholder text" />
          </div>
          <div>
            <label htmlFor="sg-select" className="field-label">Select</label>
            <select id="sg-select" className="field-input">
              <option>Option one</option>
              <option>Option two</option>
            </select>
          </div>
          <div>
            <label htmlFor="sg-date" className="field-label">Date</label>
            <input id="sg-date" type="date" className="field-input" />
          </div>
          <div>
            <label htmlFor="sg-error" className="field-label">Input with error</label>
            <input id="sg-error" className="field-input border-clay" aria-invalid="true" aria-describedby="sg-err" />
            <p id="sg-err" role="alert" className="mt-1.5 text-sm text-clay-deep">This field is required.</p>
          </div>
          <div className="sm:col-span-2">
            <span className="field-label">Chips and toggles</span>
            <div className="flex flex-wrap gap-2">
              <Chip>Good for groups</Chip>
              <Chip>Outdoor seating</Chip>
              <Chip>Walkable</Chip>
            </div>
          </div>
        </div>
      </section>

      {/* Trust components */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader
          title="Trust and disclosure components"
          description="The most important components on the site. Verification state and paid labels must never be visually ambiguous."
        />
        <div className="space-y-5 rounded-card border border-paper-edge bg-white p-6">
          <div className="flex flex-wrap gap-3">
            <VerificationBadge status="verified" date="2026-08-01" />
            <VerificationBadge status="needs-recheck" date="2026-02-14" />
            <VerificationBadge status="unverified" date="2026-08-01" />
          </div>
          <div className="flex flex-wrap gap-3">
            <PlacementLabel placement="sponsored" sponsorName="[Sponsor Name]" />
            <PlacementLabel placement="affiliate" />
          </div>
          <AffiliateDisclosure />
        </div>
      </section>

      {/* Cards */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Cards" description="Compact, near-square corners, one hairline border. No shadow stacking." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants[0] && <RestaurantCard item={restaurants[0]} />}
          {hotels[0] && <HotelCard item={hotels[0]} />}
          {guides[0] && <GuideCard item={guides[0]} />}
          {neighborhoods[0] && <NeighborhoodCard item={neighborhoods[0]} />}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {upcomingEvents(2).map((e) => (
            <EventCard key={e.slug} item={e} />
          ))}
        </div>
      </section>

      {/* Fact table */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Fact table" description="Used on every listing template for practical details." />
        <div className="max-w-md">
          <FactTable
            rows={[
              { label: 'Neighborhood', value: 'Germantown' },
              { label: 'Price', value: '$$$' },
              { label: 'Parking', value: 'Street parking, tight on weekends' },
              { label: 'Last checked', value: 'August 1, 2026' },
            ]}
          />
        </div>
      </section>

      {/* States */}
      <section className="border-t border-paper-edge py-10">
        <SectionHeader title="Empty, loading, and error states" />
        <div className="space-y-6">
          <EmptyState
            title="No results"
            description="Nothing matched that filter. Try widening your search or browsing by neighborhood."
            action={<button type="button" className="btn-primary">Clear filters</button>}
          />
          <LoadingState />
          <ErrorState
            message="We could not load this section. Refresh the page, and if it keeps happening let us know."
            retry={<button type="button" className="btn-secondary">Try again</button>}
          />
        </div>
      </section>
    </div>
  );
}
