import Link from 'next/link';
import { hasLaunchIdentity, isVerifiedSocial, site } from '@/lib/site';
import FooterNewsletter from './FooterNewsletter';
import Wordmark from './Wordmark';

/**
 * Slim charcoal footer (reference composition): the reversed lockup on the
 * left, one wrapping row of useful links, and Nashville.com as small
 * destination text on the right. Legal and disclosure lines sit beneath in
 * small type. Social links render only for verified accounts; placeholders
 * never become dead icons.
 */
const LINKS = [
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Restaurants', href: '/restaurants/' },
  { label: 'Tours', href: '/tours/' },
  { label: 'Neighborhoods', href: '/neighborhoods/' },
  { label: 'Things to do', href: '/things-to-do/' },
  { label: 'Events', href: '/events/' },
  { label: 'Hotels', href: '/hotels/' },
  { label: 'Shop', href: '/shop/' },
  { label: 'Plan', href: '/plan/' },
  { label: 'Private events', href: '/private-events/' },
  { label: 'Journal', href: '/guides/' },
  { label: 'Subscribe', href: '/newsletter/' },
  { label: 'Advertise', href: '/advertising/' },
  { label: 'Accessibility', href: '/contact/#accessibility' },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
] as const;

export default function Footer() {
  const socials = [
    { label: 'Instagram', href: site.social.instagram },
    { label: 'X', href: site.social.x },
    { label: 'Facebook', href: site.social.facebook },
  ].filter((s) => isVerifiedSocial(s.href));

  return (
    <footer className="border-t border-ink bg-ink text-paper">
      <div className="shell py-6 lg:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
          <Wordmark href="/" tone="paper" width={150} className="shrink-0" />
          <nav aria-label="Footer" className="min-w-0 flex-1">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {LINKS.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-9 items-center text-sm text-paper/90 underline-offset-[0.2em] hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex shrink-0 items-center gap-6">
            {socials.length > 0 && (
              <ul className="flex gap-4 text-sm">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} className="hover:underline" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <span className="font-sans text-2xs font-semibold uppercase tracking-[0.2em] text-paper/70">{site.destination}</span>
          </div>
        </div>

        <FooterNewsletter />

        <div className="mt-6 space-y-1.5 border-t border-paper/15 pt-4 text-[11px] leading-relaxed text-paper/55">
          <p>
            {site.positioning}{' '}
            {hasLaunchIdentity ? site.affiliation : site.affiliation.replace(' operated by [LEGAL ENTITY]', '')} We may
            earn a commission when readers make purchases or reservations through certain links; it does not determine
            our editorial recommendations.
          </p>
          {hasLaunchIdentity && (
            <address className="not-italic">
              {site.org.legalName}, {site.org.address.street}, {site.org.address.city}, {site.org.address.region}{' '}
              {site.org.address.postalCode} ·{' '}
              <a href={`mailto:${site.org.email}`} className="underline hover:text-paper">
                {site.org.email}
              </a>
            </address>
          )}
          <p>
            © {new Date().getFullYear()} {hasLaunchIdentity ? site.org.legalName : site.name}.
          </p>
        </div>
      </div>
    </footer>
  );
}
