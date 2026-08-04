import Link from 'next/link';
import { Breadcrumbs, PageHeader, FactTable } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'About us',
  description:
    'Who publishes this Nashville guide, how it stays independent, what it covers, and how to reach the people responsible for it.',
  path: '/about/',
  noindex: true,
});

export default function AboutPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'About', href: '/about/' }]} />
      <PageHeader
        eyebrow="About"
        title="About us"
        intro="An independent guide to Nashville, written by people who live here and checked before it is published."
      />
      <div className="prose-editorial py-10">
        <div className="rounded border border-clay/20 bg-clay-wash p-4 text-sm text-clay-deep not-prose">
          <strong className="font-semibold">Template page.</strong> This site is running on
          placeholder brand and business details. Before publication, the operating company, address,
          staff, and ownership disclosures on this page must be replaced with real, checkable
          information and reviewed by counsel. Nothing here should be treated as a live statement
          about an existing business.
        </div>

        <h2 className="text-2xl mt-10 mb-3">What {site.name} is</h2>
        <p>
          {site.name} is a city guide to Nashville. We publish recommendations for restaurants,
          bars, hotels, live music, events, and neighborhoods, plus a trip planner that assembles a
          day-by-day itinerary from those same listings. Everything we publish is written for
          someone making a decision: where to stay, what to book, how far apart two places are, and
          what the tradeoffs are.
        </p>
        <p>
          We write for visitors and for people who live here. Those audiences want different things
          on different days, so we say who a recommendation suits and who it does not. A room that
          is right for a first trip downtown is often the wrong room for a fourth trip.
        </p>

        <h2 className="text-2xl mt-10 mb-3">We are independent</h2>
        <p>{site.affiliation}</p>
        <p>
          {site.name} is not a tourism board, a convention and visitors bureau, or a destination
          marketing organization. We are not affiliated with Visit Music City, Nashville.com, or
          any venue, musician, hotel, or tourism organization. We are a private publisher.
        </p>
        <p>
          We are also not owned or controlled by a hotel group, restaurant group, venue operator, or
          booking platform. If that ever changes, we will say so on this page before it affects
          anything we publish.
        </p>
        <p>
          The business is supported by advertising, sponsorship, and affiliate commissions. None of
          those buy editorial coverage or position. The full explanation of what is for sale and
          what is not is on the{' '}
          <Link href="/advertising/">advertising page</Link>, and the rules our writers work under
          are in our <Link href="/editorial-standards/">editorial standards</Link>.
        </p>

        <h2 className="text-2xl mt-10 mb-3">What we cover</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong className="font-semibold text-ink">Restaurants and bars</strong>, including
            price range, what to order, reservation difficulty, and parking.
          </li>
          <li>
            <strong className="font-semibold text-ink">Hotels</strong>, judged on location,
            noise, resort and parking fees, and who the property actually suits.
          </li>
          <li>
            <strong className="font-semibold text-ink">Live music</strong>, from listening rooms and
            songwriter nights to the larger halls, with what a room is like to stand in.
          </li>
          <li>
            <strong className="font-semibold text-ink">Events</strong>, with dates confirmed against
            the organizer or venue rather than aggregated from other listings sites.
          </li>
          <li>
            <strong className="font-semibold text-ink">Neighborhoods</strong>, because in Nashville
            where you sleep decides how much of your trip you spend in a car.
          </li>
          <li>
            <strong className="font-semibold text-ink">Trip planning</strong>, through a tool that
            builds an itinerary from our published listings using set rules.
          </li>
        </ul>

        <h2 className="text-2xl mt-10 mb-3">What we do not do</h2>
        <p>
          We do not publish star ratings, and we do not carry user reviews we cannot verify. We do
          not accept payment to appear in a ranking, and we do not remove criticism on request. We
          do not describe a place we have not checked as though we have.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Who writes this</h2>
        <p>
          Every article carries a named writer and, where a piece has been through a formal check, a
          named editor. Author pages list what each person covers and how to reach them. Bylines are
          real people, never a generic desk name standing in for one.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Business details</h2>
        <p>
          These fields are placeholders in the template and must be completed before launch.
        </p>
        <div className="not-prose mt-4">
          <FactTable
            rows={[
              { label: 'Publication', value: site.name },
              { label: 'Legal entity', value: site.org.legalName },
              {
                label: 'Address',
                value: `${site.org.address.street}, ${site.org.address.city}, ${site.org.address.region} ${site.org.address.postalCode}, ${site.org.address.country}`,
              },
              { label: 'General email', value: site.org.email },
              { label: 'Editorial email', value: site.org.editorialEmail },
              { label: 'Corrections', value: site.org.correctionsEmail },
              { label: 'Advertising', value: site.org.advertisingEmail },
            ]}
          />
        </div>

        <h2 className="text-2xl mt-10 mb-3">Hold us to it</h2>
        <p>
          If something we published is wrong, tell us and we will fix it and say that we did. Send
          it to <a href={`mailto:${site.org.correctionsEmail}`}>{site.org.correctionsEmail}</a> or
          read the <Link href="/corrections/">corrections policy</Link> first. For anything else,
          the routes are on the <Link href="/contact/">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
