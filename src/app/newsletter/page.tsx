import { Breadcrumbs, PageHeader } from '@/components/Ui';
import NewsletterForm from '@/components/NewsletterForm';
import { buildMetadata } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'The weekly edit',
  description: site.newsletter.promise,
  path: '/newsletter/',
  noindex: true,
});

export default function NewsletterPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Newsletter', href: '/newsletter/' }]} />
      <PageHeader eyebrow="Newsletter" title={site.newsletter.heading} intro={site.newsletter.promise} />

      <div className="grid gap-10 py-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="prose-editorial">
          <h2 className="text-2xl">What you get</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>What is worth doing this weekend, with dates and neighborhoods.</li>
            <li>Restaurants and bars that opened recently, and whether they are worth the trip yet.</li>
            <li>Concerts and events that tend to sell out, early enough to act on.</li>
            <li>New NSVL releases, aligned with actual supply.</li>
          </ul>

          <h2 className="mt-10 text-2xl">What you do not get</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>More than one email a week.</li>
            <li>Your address sold or shared with advertisers.</li>
            <li>Sponsored content presented as an editorial recommendation. Paid items are labelled.</li>
          </ul>
        </div>

        <div className="h-fit rounded-card border border-paper-edge bg-paper-sunk p-6">
          <h2 className="text-xl">Sign up</h2>
          <div className="mt-4">
            <NewsletterForm location="newsletter-page" />
          </div>
        </div>
      </div>
    </div>
  );
}
