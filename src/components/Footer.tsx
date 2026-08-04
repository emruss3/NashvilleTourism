import Link from 'next/link';
import { footerNav, site } from '@/lib/site';
import FooterNewsletter from './FooterNewsletter';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-paper-edge bg-paper-sunk">
      <div className="shell py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <p className="font-display text-xl font-bold text-ink">{site.name}</p>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink-soft">
              {site.tagline} {site.positioning}
            </p>
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
          </div>

          {Object.entries(footerNav).map(([heading, links]) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink">{heading}</h2>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm text-ink-soft hover:text-clay hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <FooterNewsletter />

        <div className="mt-10 flex flex-col gap-4 border-t border-paper-edge pt-6 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.org.legalName}. An independent publication, not
            affiliated with the City of Nashville or any tourism board.
          </p>
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
        </div>
      </div>
    </footer>
  );
}
