import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import rightsDoc from '../../../docs/media/ASSET-RIGHTS.json';

export const metadata = buildMetadata({
  title: 'Photo credits',
  description:
    'Attribution for openly licensed photographs used on NASHVILLE, including Creative Commons and Pexels sources. Cropping and resizing are noted; photographers do not endorse this site.',
  path: '/photo-credits/',
});

const LICENSE_URLS: Record<string, string> = {
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'Public Domain': 'https://creativecommons.org/publicdomain/mark/1.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'Pexels License': 'https://www.pexels.com/license/',
};

type RightsRow = {
  credit?: string | null;
  source_page?: string | null;
  license?: string | null;
  licence?: string | null;
  recommended_use?: string | null;
  rights_status?: string | null;
  rightsStatus?: string | null;
  approvalStatus?: string | null;
  derivative_notes?: string | null;
  source_site?: string | null;
  source_filename?: string | null;
  original_title?: string | null;
  restrictions?: string | null;
  owner?: string | null;
};

type Credit = {
  photographer: string;
  sourcePages: string[];
  licenseName: string;
  licenseUrl: string;
  usedFor: string[];
  changes: string;
};

type PendingLibraryCredit = {
  owner: string;
  sourceSite: string;
  sourcePages: string[];
  usedFor: string[];
  filenames: string[];
  note: string;
};

function isClearedApproved(row: RightsRow): boolean {
  return row.rightsStatus === 'cleared' && row.approvalStatus === 'approved';
}

function isCvcRow(row: RightsRow): boolean {
  if (row.rightsStatus === 'reference-only') return true;
  const blob = `${row.source_site || ''} ${row.owner || ''} ${row.credit || ''} ${row.restrictions || ''}`.toLowerCase();
  return (
    blob.includes('cvc') ||
    blob.includes('visit music city') ||
    blob.includes('convention & visitors') ||
    blob.includes('convention and visitors')
  );
}

function uniqueOpenLicenseCredits(rows: RightsRow[]): Credit[] {
  /** One article per photographer + license so multi-source credits (e.g. Pexels) stay grouped. */
  const byPhotographer = new Map<string, Credit>();

  for (const row of rows) {
    if (row.rightsStatus === 'reference-only') continue;
    if (!isClearedApproved(row) && !String(row.rights_status || '').startsWith('approved-')) continue;
    const license = row.license || null;
    if (!row.credit || !row.source_page || !license) continue;
    if (
      row.rights_status &&
      !['approved-open-license', 'approved-public-domain', 'approved-owned'].includes(row.rights_status)
    ) {
      continue;
    }

    const licenseUrl = LICENSE_URLS[license] || (row as RightsRow & { licenseUrl?: string }).licenseUrl;
    if (!licenseUrl) continue;

    const key = `${row.credit}::${license}`;
    const existing = byPhotographer.get(key);
    const use = row.recommended_use?.trim() || 'Editorial photography';
    const changes =
      row.derivative_notes?.trim() ||
      'Cropped and resized for web placement; no generative editing.';

    if (existing) {
      if (!existing.usedFor.includes(use)) existing.usedFor.push(use);
      if (!existing.sourcePages.includes(row.source_page)) existing.sourcePages.push(row.source_page);
      continue;
    }

    byPhotographer.set(key, {
      photographer: row.credit,
      sourcePages: [row.source_page],
      licenseName: license,
      licenseUrl,
      usedFor: [use],
      changes,
    });
  }

  return [...byPhotographer.values()].sort((a, b) => a.photographer.localeCompare(b.photographer));
}

function pendingNonCvcCredits(rows: RightsRow[]): PendingLibraryCredit[] {
  const byOwner = new Map<string, PendingLibraryCredit>();
  for (const row of rows) {
    if (isCvcRow(row)) continue;
    if (row.rightsStatus !== 'pending-clearance' && row.rights_status !== 'pending-authorization') {
      continue;
    }
    const owner = row.credit || row.owner;
    const site = row.source_site || row.owner;
    if (!owner || !site) continue;
    const existing = byOwner.get(owner);
    const use = row.recommended_use?.trim() || 'Editorial photography';
    const page = row.source_page || site;
    const filename = row.source_filename || row.original_title || 'source file';
    if (existing) {
      if (!existing.usedFor.includes(use)) existing.usedFor.push(use);
      if (!existing.sourcePages.includes(page)) existing.sourcePages.push(page);
      if (!existing.filenames.includes(filename)) existing.filenames.push(filename);
      continue;
    }
    byOwner.set(owner, {
      owner,
      sourceSite: site,
      sourcePages: [page],
      usedFor: [use],
      filenames: [filename],
      note:
        row.restrictions?.trim() ||
        'Commercial digital website rights still required. No public license is claimed. Not shown in production until cleared and approved.',
    });
  }
  return [...byOwner.values()].sort((a, b) => a.owner.localeCompare(b.owner));
}

export default function PhotoCreditsPage() {
  const credits = uniqueOpenLicenseCredits(rightsDoc.assets as RightsRow[]);
  const pending = pendingNonCvcCredits(rightsDoc.assets as RightsRow[]);

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Photo credits', href: '/photo-credits/' }]} />
      <PageHeader
        eyebrow="Attribution"
        title="Photo credits"
        intro="Openly licensed photographs used on this site are listed below. Creative Commons images require attribution; Pexels License images do not, but are listed for completeness. Visit Music City / Nashville CVC photography is not used and is not listed — NashRoam does not pursue those rights. Other property media awaiting commercial clearance is recorded separately and is not shown in production. Photographers and rights holders do not endorse NASHVILLE."
      />

      <section className="max-w-3xl space-y-8 py-8">
        {credits.map((credit) => (
          <article
            key={`${credit.photographer}::${credit.licenseName}`}
            className="border-b border-paper-edge pb-6"
          >
            <h2 className="font-sans text-lg font-bold text-ink">{credit.photographer}</h2>
            <ul className="mt-3 space-y-1.5 text-small leading-relaxed text-ink-soft">
              <li>
                <span className="font-medium text-ink">Used for:</span> {credit.usedFor.join('; ')}
              </li>
              <li>
                <span className="font-medium text-ink">
                  {credit.sourcePages.length > 1 ? 'Sources:' : 'Source:'}
                </span>{' '}
                {credit.sourcePages.length === 1 ? (
                  <a
                    href={credit.sourcePages[0]}
                    className="text-clay underline hover:text-clay-deep"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {credit.sourcePages[0]}
                  </a>
                ) : (
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {credit.sourcePages.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          className="text-clay underline hover:text-clay-deep"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              <li>
                <span className="font-medium text-ink">License:</span>{' '}
                <a
                  href={credit.licenseUrl}
                  className="text-clay underline hover:text-clay-deep"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {credit.licenseName}
                </a>
              </li>
              <li>
                <span className="font-medium text-ink">Changes:</span> {credit.changes}
              </li>
            </ul>
          </article>
        ))}
      </section>

      {pending.length > 0 ? (
        <section className="max-w-3xl space-y-8 border-t border-paper-edge py-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Property media awaiting commercial clearance
          </h2>
          <p className="text-small leading-relaxed text-ink-soft">
            These sources are recorded for chain-of-custody only. They are not shown on the live site
            until each asset is marked cleared and approved for commercial digital editorial use on
            NashRoam.com. Visit Music City / Nashville CVC assets are excluded from this list and
            from production permanently.
          </p>
          {pending.map((item) => (
            <article key={item.owner} className="border-b border-paper-edge pb-6">
              <h3 className="font-sans text-lg font-bold text-ink">{item.owner}</h3>
              <ul className="mt-3 space-y-1.5 text-small leading-relaxed text-ink-soft">
                <li>
                  <span className="font-medium text-ink">Source:</span> {item.sourceSite}
                </li>
                <li>
                  <span className="font-medium text-ink">Intended for:</span> {item.usedFor.join('; ')}
                </li>
                <li>
                  <span className="font-medium text-ink">Source filenames:</span>{' '}
                  {item.filenames.join('; ')}
                </li>
                <li>
                  <span className="font-medium text-ink">Status:</span> {item.note}
                </li>
              </ul>
            </article>
          ))}
        </section>
      ) : null}

      <p className="max-w-3xl text-sm text-ink-faint">
        Owned BPH photography used editorially on this site does not require public photographer
        attribution unless a specific agreement says otherwise. Full internal rights records live in
        the project documentation and are not published here.
      </p>
    </div>
  );
}
