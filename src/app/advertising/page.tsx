import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Advertising and sponsorship',
  description:
    'What is for sale on this site, what is not for sale at any price, how paid content is labeled, and how affiliate commissions work.',
  path: '/advertising/',
});

export default function AdvertisingPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Advertising', href: '/advertising/' }]} />
      <PageHeader
        eyebrow="Commercial"
        title="Advertising and sponsorship"
        intro="How we make money, stated plainly, including the things we will not sell."
      />
      <div className="prose-editorial py-10">
        <div className="rounded border border-clay/20 bg-clay-wash p-4 text-sm text-clay-deep not-prose">
          <strong className="font-semibold">Template page.</strong> This is placeholder commercial
          policy text. Rates, inventory, contract terms, and disclosure language must be reviewed by
          counsel and completed with real business details before publication. Nothing on this page
          is an offer, and no product described here is currently for sale.
        </div>

        <p className="mt-6">
          {site.name} is supported by advertising, sponsorship, and affiliate commissions. We would
          rather tell you exactly how that works than let you guess. The short version: money can buy
          attention on this site, clearly marked as such. It cannot buy a recommendation.
        </p>

        <h2 className="text-2xl mt-10 mb-3">What is for sale</h2>
        <h3 className="text-xl mt-6 mb-2">Sponsored listings</h3>
        <p>
          A business can pay to appear in a marked sponsored slot on a relevant page. Sponsored slots
          sit outside the editorial list, carry a <em>Sponsored</em> label with the sponsor named,
          and are styled so they do not read as an editorial pick. They do not displace, reorder, or
          remove any editorial entry.
        </p>
        <h3 className="text-xl mt-6 mb-2">Newsletter sponsorship</h3>
        <p>
          A single sponsor slot per newsletter send, labeled in the email itself. Sponsors receive
          delivery and click reporting. They do not receive subscriber names, email addresses, or any
          other personal data.
        </p>
        <h3 className="text-xl mt-6 mb-2">Neighborhood sponsorship</h3>
        <p>
          A business can sponsor a neighborhood section for a set term. The sponsor is named in a
          labeled unit on those pages. Sponsorship does not give the sponsor any influence over which
          places appear in that neighborhood&rsquo;s coverage, how they are described, or the order
          they appear in.
        </p>
        <h3 className="text-xl mt-6 mb-2">Display advertising</h3>
        <p>
          Standard display units in fixed positions. We do not run units designed to look like
          editorial content, auto-playing audio, interstitials that block the page, or anything that
          makes a page harder to read on a phone.
        </p>
        <h3 className="text-xl mt-6 mb-2">Affiliate links</h3>
        <p>
          Some booking and ticketing links earn us a commission. These are placed on editorial picks
          we already recommend, and they are labeled. See the disclosure below for how this works and
          what it does not affect.
        </p>

        <h2 className="text-2xl mt-10 mb-3">What is not for sale, at any price</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong className="font-semibold text-ink">Editorial rankings and inclusion.</strong>{' '}
            There is no fee to be recommended, to rank higher, or to appear in a guide. Editorial
            order is set by editors on the criteria in{' '}
            <Link href="/how-we-choose/">how we choose</Link>.
          </li>
          <li>
            <strong className="font-semibold text-ink">Removal of criticism.</strong> We correct
            anything factually wrong for free and immediately. We do not remove accurate criticism,
            for money or for the promise of future business.
          </li>
          <li>
            <strong className="font-semibold text-ink">Guaranteed positive coverage.</strong> Nobody
            buys a favorable review, a specific adjective, or an agreement to publish at all. A
            comped meal or room is not a purchase of coverage.
          </li>
          <li>
            <strong className="font-semibold text-ink">Copy approval.</strong> Advertisers do not
            read editorial coverage before publication and do not get to change it afterward.
          </li>
          <li>
            <strong className="font-semibold text-ink">Exclusion of a competitor.</strong> Buying
            from us never keeps someone else out of a guide.
          </li>
          <li>
            <strong className="font-semibold text-ink">Reader data.</strong> We do not sell email
            addresses or personal information to advertisers. See the{' '}
            <Link href="/privacy/">privacy policy</Link>.
          </li>
        </ul>
        <p>
          Asking for any of the above ends the conversation, and it does not affect how we cover the
          business afterward, in either direction.
        </p>

        <h2 className="text-2xl mt-10 mb-3">How paid content is labeled</h2>
        <p>
          Every commercial relationship is labeled where you encounter it, in words, not in a symbol
          you have to decode. We use three labels and no others:
        </p>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong className="font-semibold text-ink">Sponsored.</strong> The placement was paid
            for. The sponsor is named. It was not selected by the editorial desk and is not part of
            any ranking.
          </li>
          <li>
            <strong className="font-semibold text-ink">Paid partnership.</strong> The content itself
            was paid for. It is written or reviewed to a separate standard, is visually distinct from
            editorial, and names the partner at the top. It never appears under an editorial
            writer&rsquo;s byline as though it were editorial work.
          </li>
          <li>
            <strong className="font-semibold text-ink">Affiliate link.</strong> An editorial
            recommendation whose booking link earns us a commission. The recommendation came first.
          </li>
        </ul>
        <p>
          Labels appear next to the item, before you click, and they are not styled to disappear into
          the page. If you find a paid placement on this site that is not labeled, that is a
          reportable error. Send it to{' '}
          <a href={`mailto:${site.org.correctionsEmail}`}>{site.org.correctionsEmail}</a> and we will
          treat it as a <Link href="/corrections/">correction</Link>.
        </p>

        <section id="partner">
          <h2 className="text-2xl mt-10 mb-3">Partner with us</h2>
          <p>
            If you run a business in Nashville and want to reach people planning a trip or looking
            for somewhere to go this weekend, write to{' '}
            <a href={`mailto:${site.org.advertisingEmail}`}>{site.org.advertisingEmail}</a>.
          </p>
          <h3 className="text-xl mt-6 mb-2">What to include</h3>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>Your business, its address, and the category it fits.</li>
            <li>What you want out of it: bookings, covers, ticket sales, awareness of an opening.</li>
            <li>Your timing and the budget range you are working with.</li>
            <li>Whether you need creative produced or already have it.</li>
          </ul>
          <h3 className="text-xl mt-6 mb-2">How the process works</h3>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              Commercial staff handle the entire conversation. No editorial writer or editor is
              involved in a sale.
            </li>
            <li>
              We confirm available inventory and terms in writing, including how the placement will
              be labeled. Labeling is not negotiable.
            </li>
            <li>
              Creative is reviewed against the same standards as everything else on the site: no
              claims we can see are false, no design meant to imitate editorial content, no dark
              patterns.
            </li>
            <li>
              You get reporting on the placement. You do not get reader data, and you do not get
              advance notice of editorial coverage.
            </li>
          </ul>
          <h3 className="text-xl mt-6 mb-2">Who we turn down</h3>
          <p>
            We decline advertising that is misleading, that targets vulnerable people, or that comes
            with conditions about editorial coverage. We also decline placements we could not defend
            to a reader who asked why they were there.
          </p>
        </section>

        <section id="disclosure">
          <h2 className="text-2xl mt-10 mb-3">Sponsorship and affiliate disclosure</h2>
          <p>
            This is the formal statement referenced by the disclosure notices throughout the site.
          </p>
          <p>
            {site.name} earns revenue from advertising, sponsored placements, paid partnerships, and
            affiliate commissions. Some links to hotels, restaurants, tours, and ticketing on this
            site are affiliate links. If you book or buy through one of them, the merchant or booking
            platform may pay us a commission. The price you pay is the same as it would be if you
            went to the merchant directly. Commission rates differ between partners, and we do not
            allow that difference to influence what we recommend or the order in which we list
            things.
          </p>
          <p>
            Affiliate links are only added to places our editorial desk already recommends on the
            merits. Many of our recommendations earn us nothing at all, because no commission program
            exists or because we chose not to join one. Removing a place from a guide because it does
            not pay a commission is not something we do, and adding one because it does is not either.
          </p>
          <p>
            Sponsored placements and paid partnerships are bought by the business named in the label.
            They are separated from editorial content, do not enter editorial rankings, and are
            identified with the labels described above. Editorial staff have no revenue targets tied
            to any specific business.
          </p>
          <p>
            When a visit was comped, discounted, or provided as part of a press trip, we disclose it
            on the resulting page. Accepting one never includes agreed coverage or approval over what
            we publish.
          </p>
          <p>
            We do not sell your personal information. Affiliate partners and advertisers may set
            their own tracking when you follow a link to their site, which is described in the{' '}
            <Link href="/privacy/">privacy policy</Link>.
          </p>
          <p>
            The editorial rules behind this are in our{' '}
            <Link href="/editorial-standards/">editorial standards</Link> and{' '}
            <Link href="/how-we-choose/">how we choose</Link>. Questions about a specific placement
            can go to <a href={`mailto:${site.org.email}`}>{site.org.email}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
