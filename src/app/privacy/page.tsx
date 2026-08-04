import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Privacy policy',
  description:
    'What data this site collects, how analytics and affiliate tracking work, how email addresses are handled, and how to exercise your data rights.',
  path: '/privacy/',
  noindex: true,
});

export default function PrivacyPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Privacy policy', href: '/privacy/' }]} />
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        intro="What we collect, why, and what you can do about it."
      />

      <div className="mt-6 max-w-prose rounded border border-clay/20 bg-clay-wash p-4 text-sm text-clay-deep">
        <strong className="font-semibold">Template, not final policy.</strong> This is placeholder
        text for a site that has not launched. Before publication it must be reviewed by counsel and
        completed with the operating entity&rsquo;s real details, the actual analytics and email
        vendors in use, and the jurisdictions the business is subject to.
      </div>

      <div className="prose-editorial py-10">
        <p>
          {site.name} is published by {site.org.legalName}. This policy covers {site.domain} and the
          newsletter. It does not cover sites we link to, including booking, ticketing, and
          reservation partners, each of which has its own policy.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">What we collect</h2>

        <h3 className="mt-6 mb-2 text-xl">Information you give us</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-ink">Email address</strong>, if you subscribe to
            the newsletter. We ask for nothing else to subscribe.
          </li>
          <li>
            <strong className="font-semibold text-ink">Message contents</strong>, if you email us a
            correction, a tip, or an advertising enquiry. We keep correspondence so we can follow up
            and so corrections have a record.
          </li>
          <li>
            <strong className="font-semibold text-ink">Trip planner answers</strong>, if you use the
            planner. In the current build these stay in your browser and are not transmitted to us.
            If saved itineraries and accounts are added later, this policy will be updated before
            that ships.
          </li>
        </ul>

        <h3 className="mt-6 mb-2 text-xl">Information collected automatically</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            Standard request data your browser sends: IP address, user agent, referring page, and
            the pages you view. This is used in aggregate to understand what is worth writing more
            of.
          </li>
          <li>
            Interaction events such as searches run, guides read, and links clicked. These are
            recorded against a page, not against a name. The full list is published in our{' '}
            <a href="https://github.com" rel="noopener noreferrer">
              analytics documentation
            </a>{' '}
            so you can see exactly what is measured.
          </li>
        </ul>
        <p>
          We do not ask for or store payment details. Bookings and ticket purchases happen on
          partner sites, not here.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Analytics</h2>
        <p>
          We use analytics to count visits and see which pages are useful. We aim to configure it
          with IP anonymisation on and advertising and cross-site features off, and to choose a
          vendor that does not build advertising profiles from our readers.
        </p>
        <p>
          The specific provider must be named here before launch, along with a link to its own
          privacy policy and the data-retention window we set.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Cookies and similar storage</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-ink">Necessary</strong> storage keeps the site
            working, for example remembering that you dismissed a notice.
          </li>
          <li>
            <strong className="font-semibold text-ink">Analytics</strong> storage records the
            aggregate usage described above.
          </li>
          <li>
            <strong className="font-semibold text-ink">Affiliate</strong> cookies may be set by a
            partner when you click a booking or ticket link, so that a resulting booking is
            attributed to us.
          </li>
        </ul>
        <p>
          We do not run advertising retargeting pixels. Where consent is legally required, a consent
          banner must be in place before analytics or affiliate tracking loads. That banner is not
          implemented in this build.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Affiliate links</h2>
        <p>
          Some links to hotels, tickets, and activities earn us a commission. Clicking one usually
          passes an identifier to the partner and may set a cookie on their domain. What they do
          with it is governed by their policy, not ours. Commissions never affect what we recommend
          or the order we list things in, which is explained in{' '}
          <Link href="/how-we-choose/">how we choose</Link> and{' '}
          <Link href="/advertising/#disclosure">our advertising disclosure</Link>.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Email</h2>
        <p>
          Newsletter addresses are used to send the newsletter and nothing else. We do not sell,
          rent, or share reader lists with advertisers. A sponsor may pay to appear inside an issue,
          but they never receive your address. Every issue carries a working unsubscribe link, and
          unsubscribing removes you from the sending list.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Who else touches your data</h2>
        <p>
          We share data only with vendors that operate the site on our behalf: hosting and content
          delivery, the analytics provider, and the email provider. Each must be named here before
          launch. We also disclose information where the law requires it. We do not sell personal
          information.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">How long we keep it</h2>
        <p>
          Newsletter addresses are kept until you unsubscribe. Correspondence is kept as long as it
          is useful for follow-up and for the correction record. Analytics data is kept for the
          retention window configured with the provider, which must be stated here before launch.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Your rights</h2>
        <p>
          Depending on where you live, you may have the right to see what we hold about you, correct
          it, delete it, object to processing, take it elsewhere, or opt out of its sale. We do not
          sell personal information. Readers in the EU and UK have these rights under GDPR, and
          California residents have comparable rights under the CCPA and CPRA.
        </p>
        <p>
          To make a request, email{' '}
          <a href={`mailto:${site.org.email}`}>{site.org.email}</a>. We will not treat you
          differently for exercising a right.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Children</h2>
        <p>
          This site is written for adults planning travel and is not directed at children under 13.
          We do not knowingly collect their information. If you believe a child has given us data,
          write to us and we will delete it.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Changes</h2>
        <p>
          When this policy changes materially, we will update the date below and say what changed.
          Continuing to use the site after a change means the revised policy applies.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Contact</h2>
        <p>
          {site.org.legalName}
          <br />
          {site.org.address.street}, {site.org.address.city}, {site.org.address.region}{' '}
          {site.org.address.postalCode}
          <br />
          <a href={`mailto:${site.org.email}`}>{site.org.email}</a>
        </p>
        <p className="text-sm text-ink-faint">
          Last updated: not yet published. Set this date when the policy is finalised.
        </p>
      </div>
    </div>
  );
}
