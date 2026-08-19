import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Terms of use',
  description:
    'The terms that apply when you use this site: acceptable use, accuracy, third-party bookings, intellectual property, and liability.',
  path: '/terms/',
});

export default function TermsPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Terms of use', href: '/terms/' }]} />
      <PageHeader
        eyebrow="Legal"
        title="Terms of use"
        intro="The rules that apply when you use this site."
      />

      <div className="mt-6 max-w-prose rounded border border-clay/20 bg-paper-card p-4 text-sm text-clay-deep">
        <strong className="font-semibold">Template, not final terms.</strong> This is placeholder
        text for a site that has not launched. Before publication it must be reviewed by counsel and
        completed with the operating entity&rsquo;s details and governing jurisdiction.
      </div>

      <div className="prose-editorial py-10">
        <p>
          These terms are an agreement between you and {site.org.legalName}, which publishes{' '}
          {site.name} at {site.domain}. Using the site means you accept them. If you do not, please
          do not use the site.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Using the site</h2>
        <p>You may read, print, and share our pages for your own personal and non-commercial use.</p>
        <p>You may not:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Scrape, crawl, or bulk-copy our content to republish it or train a competing product.</li>
          <li>Republish substantial portions of our writing without written permission.</li>
          <li>Present our recommendations as an endorsement of your business.</li>
          <li>Interfere with the site&rsquo;s operation or attempt to gain access you were not given.</li>
          <li>Use the site for anything unlawful.</li>
        </ul>
        <p>
          Quoting a short passage with a link and clear attribution is fine and welcome.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Accuracy and editorial judgment</h2>
        <p>
          We work to keep listings correct and we date them so you can see how current they are.
          Even so, details change constantly: hours shift, kitchens close, events move, prices rise.
          Information here is provided as-is, and you should confirm anything your plans depend on
          with the business or venue directly.
        </p>
        <p>
          Recommendations are opinions formed by named writers and editors. They are not guarantees
          about the quality, safety, or suitability of any place. How we form them is set out in{' '}
          <Link href="/how-we-choose/">how we choose</Link>. If something here is wrong, our{' '}
          <Link href="/corrections/">corrections policy</Link> explains how to tell us.
        </p>
        <p>
          Parts of this build are seeded with sample records that have not been verified. They are
          labelled on the page and must not be relied on.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Third-party links and bookings</h2>
        <p>
          We link to hotels, ticket sellers, reservation platforms, and other sites we do not
          control. When you book, buy, or reserve through one of them, the contract is between you
          and that provider under their terms. We are not a travel agency and we are not a party to
          the transaction.
        </p>
        <p>
          We are not responsible for a partner&rsquo;s pricing, availability, cancellations,
          refunds, or service. Some of these links earn us a commission, which is disclosed on the
          page and explained in our{' '}
          <Link href="/advertising/#disclosure">advertising disclosure</Link>.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Intellectual property</h2>
        <p>
          The writing, photography, design, and code on this site belong to {site.org.legalName} or
          are used with permission. Business names, logos, and trademarks belong to their owners and
          appear here for identification and commentary. Their appearance does not imply any
          partnership or endorsement unless we say so and label it.
        </p>
        <p>
          If you believe something here infringes your rights, write to{' '}
          <a href={`mailto:${site.org.email}`}>{site.org.email}</a> with enough detail to identify
          the material and we will review it.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Anything you send us</h2>
        <p>
          If you send a tip, correction, or suggestion, you give us permission to use it in our
          reporting without payment or attribution, unless we agree otherwise. Do not send
          confidential information you are not free to share.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Liability</h2>
        <p>
          To the fullest extent the law allows, the site is provided without warranties of any kind,
          and {site.org.legalName} is not liable for indirect, incidental, or consequential losses
          arising from your use of it, including trips, bookings, or plans made on the basis of
          something you read here.
        </p>
        <p>
          Nothing in these terms limits liability that cannot lawfully be limited. Some
          jurisdictions do not allow certain exclusions, so parts of this section may not apply to
          you.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Availability</h2>
        <p>
          We may change, suspend, or withdraw any part of the site at any time, and we may update or
          remove content as facts change. We do not guarantee uninterrupted access.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Changes to these terms</h2>
        <p>
          We may revise these terms. When we make a material change we will update the date below.
          Continuing to use the site after that means the revised terms apply.
        </p>

        <h2 className="mt-10 mb-3 text-2xl">Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Tennessee, United States, without
          regard to conflict-of-law rules. Counsel should confirm this and the venue for disputes
          before launch.
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
          Last updated: not yet published. Set this date when the terms are finalised.
        </p>
      </div>
    </div>
  );
}
