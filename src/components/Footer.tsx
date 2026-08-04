import Link from 'next/link';
import { footerNav, hasLaunchIdentity, site } from '@/lib/site';
import FooterNewsletter from './FooterNewsletter';
import Wordmark from './Wordmark';

export default function Footer() {
  return (
    <footer className="border-t border-paper-edge bg-paper">
      <div className="shell py-12 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark href="/" size="footer" />
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink-soft">
              {site.positioning}
            </p>
            {hasLaunchIdentity && (
              <address className="mt-4 space-y-0.5 text-sm not-italic text-ink-faint">
                <p>{site.org.legalName}</p>
                <p>
                  {site.org.address.street}, {site.org.address.city}, {site.org.address.region}{' '}
                  {site.org.address.postalCode}
                </p>
                <p>
                  <a href={`mailto:${site.org.email}`} className="underline hover:text-ink">
                    {site.org.email}
                  </a>
                </p>
              </address>
            )}
          </div>

          {Object.entries(footerNav).map(([heading, links]) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">
                {heading}
              </h2>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft hover:text-clay hover:underline"
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

        <div className="mt-10 space-y-3 border-t border-paper-edge pt-6 text-sm text-ink-faint">
          <p>
            {hasLaunchIdentity
              ? site.affiliation
              : 'NASHVILLE is an independent city guide. It is not affiliated with the Metropolitan Government of Nashville and Davidson County or the Nashville Convention & Visitors Corp.'}
          </p>
          <p>
            We may earn a commission when readers make purchases or reservations through certain
            links. This does not determine our editorial recommendations.
          </p>
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {hasLaunchIdentity ? site.org.legalName : site.name}.
            </p>
            {hasLaunchIdentity && (
              <ul className="flex gap-4">
                <li>
                  <a href={site.social.instagram} className="hover:text-ink" rel="noopener noreferrer">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href={site.social.x} className="hover:text-ink" rel="noopener noreferrer">
                    X
                  </a>
                </li>
                <li>
                  <a href={site.social.facebook} className="hover:text-ink" rel="noopener noreferrer">
                    Facebook
                  </a>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
