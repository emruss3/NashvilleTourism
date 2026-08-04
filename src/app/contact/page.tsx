import Link from 'next/link';
import { Breadcrumbs, PageHeader, FactTable } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Contact',
  description:
    'How to reach the right person: general questions, editorial and story pitches, corrections, and advertising, plus our postal address.',
  path: '/contact/',
});

export default function ContactPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Contact', href: '/contact/' }]} />
      <PageHeader
        eyebrow="Get in touch"
        title="Contact"
        intro="Four routes, each read by a person. Pick the closest one and we will move it internally if it lands in the wrong place."
      />
      <div className="prose-editorial py-10">
        <h2 className="text-2xl mt-10 mb-3">Where to write</h2>
        <div className="not-prose mt-4">
          <FactTable
            rows={[
              {
                label: 'General',
                value: (
                  <>
                    <a
                      href={`mailto:${site.org.email}`}
                      className="text-clay underline underline-offset-2"
                    >
                      {site.org.email}
                    </a>
                    <span className="block text-ink-faint">
                      Anything that does not fit below, including questions about the site itself.
                    </span>
                  </>
                ),
              },
              {
                label: 'Editorial',
                value: (
                  <>
                    <a
                      href={`mailto:${site.org.editorialEmail}`}
                      className="text-clay underline underline-offset-2"
                    >
                      {site.org.editorialEmail}
                    </a>
                    <span className="block text-ink-faint">
                      Story pitches, tips, openings and closings, questions about how we sourced a
                      claim, and challenges to a recommendation.
                    </span>
                  </>
                ),
              },
              {
                label: 'Corrections',
                value: (
                  <>
                    <a
                      href={`mailto:${site.org.correctionsEmail}`}
                      className="text-clay underline underline-offset-2"
                    >
                      {site.org.correctionsEmail}
                    </a>
                    <span className="block text-ink-faint">
                      A specific factual error: wrong hours, price, address, date, or name. Include
                      the page URL.
                    </span>
                  </>
                ),
              },
              {
                label: 'Advertising',
                value: (
                  <>
                    <a
                      href={`mailto:${site.org.advertisingEmail}`}
                      className="text-clay underline underline-offset-2"
                    >
                      {site.org.advertisingEmail}
                    </a>
                    <span className="block text-ink-faint">
                      Sponsorship, partnerships, and paid placements. Handled by commercial staff, not
                      by editors.
                    </span>
                  </>
                ),
              },
              {
                label: 'Post',
                value: (
                  <>
                    {site.org.legalName}
                    <span className="block">{site.org.address.street}</span>
                    <span className="block">
                      {site.org.address.city}, {site.org.address.region}{' '}
                      {site.org.address.postalCode}
                    </span>
                    <span className="block">{site.org.address.country}</span>
                  </>
                ),
              },
            ]}
          />
        </div>
        <p className="mt-6">
          The address above is a placeholder in this template and must be replaced with a real
          business address before launch.
        </p>

        <h2 className="text-2xl mt-10 mb-3">Response times</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong className="font-semibold text-ink">Corrections:</strong> acknowledged within two
            business days, and confirmed factual errors are usually fixed the same day we confirm
            them.
          </li>
          <li>
            <strong className="font-semibold text-ink">Editorial and general:</strong> we aim to reply
            within five business days. Pitches that we are not going to take up may not get a reply,
            and we would rather say that than pretend otherwise.
          </li>
          <li>
            <strong className="font-semibold text-ink">Advertising:</strong> within three business
            days.
          </li>
        </ul>

        <h2 className="text-2xl mt-10 mb-3">A few things worth knowing</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            Include the page URL for anything about published content. It saves a round trip.
          </li>
          <li>
            We cannot make reservations, sell tickets, or resolve a dispute with a business on your
            behalf. Contact the venue directly.
          </li>
          <li>
            We do not take payment to add, move, or remove an editorial listing. See the{' '}
            <Link href="/advertising/">advertising page</Link> for what we do sell.
          </li>
          <li>
            If you are asking us to change coverage of your business, read{' '}
            <Link href="/corrections/">corrections</Link> and{' '}
            <Link href="/how-we-choose/">how we choose</Link> first. It will get you a faster and
            more useful answer.
          </li>
          <li>
            Privacy requests, including access and deletion, go to{' '}
            <a href={`mailto:${site.org.email}`}>{site.org.email}</a>. Details are in the{' '}
            <Link href="/privacy/">privacy policy</Link>.
          </li>
        </ul>
      </div>
    </div>
  );
}
