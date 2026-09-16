import Link from 'next/link';
import { footerNav, hasLaunchIdentity, isVerifiedSocial, site } from '@/lib/site';
import FooterNewsletter from './FooterNewsletter';
import Wordmark from './Wordmark';

/**
 * Slim charcoal footer (reference composition): the reversed lockup on the
 * left, one wrapping row of useful links, and Nashville.com as small
 * destination text on the right. Legal and disclosure lines sit beneath.
 * Social links render only for verified accounts; placeholders never
 * become dead icons.
 */
export default function Footer() {
  const socials = [
    { label: 'Instagram', href: site.social.instagram },
    { label: 'X', href: site.social.x },
    { label: 'Facebook', href: site.social.facebook },
  ].filter((s) => isVerifiedSocial(s.href));

  const groups = Object.entries(footerNav);

  return (
    <footer className="border-t border-ink bg-ink text-paper">
      <div className="shell py-10 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="shrink-0">
            <Wordmark href="/" tone="paper" width={160} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/75">{site.positioning}</p>
          </div>

          <nav aria-label="Footer" className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4 lg:max-w-3xl">
            {groups.map(([heading, links]) => (
              <div key={heading}>
                <h2 className="font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-paper/60">{heading}</h2>
                <ul className="mt-2">
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
              </div>
            ))}
          </nav>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <span className="font-sans text-2xs font-semibold uppercase tracking-[0.2em] text-paper/70">{site.destination}</span>
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
          </div>
        </div>

        <FooterNewsletter />

        <div className="mt-8 space-y-2 border-t border-paper/15 pt-5 text-xs leading-relaxed text-paper/60">
          <p>{hasLaunchIdentity ? site.affiliation : site.affiliation.replace(' operated by [LEGAL ENTITY]', '')}</p>
          <p>
            We may earn a commission when readers make purchases or reservations through certain links. This does
            not determine our editorial recommendations.
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
