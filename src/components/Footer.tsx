import Link from 'next/link';
import { footerNav, hasLaunchIdentity, isVerifiedSocial, site } from '@/lib/site';
import FooterNewsletter from './FooterNewsletter';
import Wordmark from './Wordmark';

/**
 * Site footer (SITE-LAYOUT.md §Newsletter and footer). Charcoal band with the
 * reversed lockup, useful link groups, and the one-line explanation of how
 * NSVL and Nashville.com relate. Social links render only for verified
 * accounts; placeholders never become dead icons.
 */
export default function Footer() {
  const socials = [
    { label: 'Instagram', href: site.social.instagram },
    { label: 'X', href: site.social.x },
    { label: 'Facebook', href: site.social.facebook },
  ].filter((s) => isVerifiedSocial(s.href));

  return (
    <footer className="band-dark border-t border-ink bg-ink text-paper">
      <div className="shell py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark href="/" tone="paper" width={200} />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-paper/80">
              {site.positioning}
            </p>
            {hasLaunchIdentity && (
              <address className="mt-4 space-y-0.5 text-sm not-italic text-paper/70">
                <p>{site.org.legalName}</p>
                <p>
                  {site.org.address.street}, {site.org.address.city}, {site.org.address.region}{' '}
                  {site.org.address.postalCode}
                </p>
                <p>
                  <a href={`mailto:${site.org.email}`} className="underline hover:text-paper">
                    {site.org.email}
                  </a>
                </p>
              </address>
            )}
          </div>

          {Object.entries(footerNav).map(([heading, links]) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-paper/70">
                {heading}
              </h2>
              <ul className="mt-3 space-y-1">
                {links.map((link) => (
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
          ))}
        </div>

        <FooterNewsletter />

        <div className="mt-10 space-y-3 border-t border-paper/15 pt-6 text-sm text-paper/70">
          <p>{hasLaunchIdentity ? site.affiliation : site.affiliation.replace(' operated by [LEGAL ENTITY]', '')}</p>
          <p>
            We may earn a commission when readers make purchases or reservations through certain
            links. This does not determine our editorial recommendations.
          </p>
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {hasLaunchIdentity ? site.org.legalName : site.name}.{' '}
              <span className="font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-paper/60">
                {site.destination}
              </span>
            </p>
            {socials.length > 0 && (
              <ul className="flex gap-4">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} className="hover:text-paper" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
