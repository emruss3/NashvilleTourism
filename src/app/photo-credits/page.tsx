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
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'Pexels License': 'https://www.pexels.com/license/',
};

type RightsRow = {
  credit?: string | null;
  source_page?: string | null;
  license?: string | null;
  recommended_use?: string | null;
  rights_status?: string | null;
  derivative_notes?: string | null;
  source_site?: string | null;
  source_filename?: string | null;
  original_title?: string | null;
  restrictions?: string | null;
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

function uniqueOpenLicenseCredits(rows: RightsRow[]): Credit[] {
  /** One article per photographer + license so multi-source credits (e.g. Pexels) stay grouped. */
  const byPhotographer = new Map<string, Credit>();

  for (const row of rows) {
    if (row.rights_status !== 'approved-open-license') continue;
    if (!row.credit || !row.source_page || !row.license) continue;

    const licenseUrl = LICENSE_URLS[row.license];
    if (!licenseUrl) continue;

    const key = `${row.credit}::${row.license}`;
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
      licenseName: row.license,
      licenseUrl,
      usedFor: [use],
      changes,
    });
  }

  return [...byPhotographer.values()].sort((a, b) => a.photographer.localeCompare(b.photographer));
}

function pendingLibraryCredits(rows: RightsRow[]): PendingLibraryCredit[] {
  const byOwner = new Map<string, PendingLibraryCredit>();
  for (const row of rows) {
    if (row.rights_status !== 'pending-authorization') continue;
    if (!row.credit || !row.source_site) continue;
    const existing = byOwner.get(row.credit);
    const use = row.recommended_use?.trim() || 'Editorial photography';
    const page = row.source_page || row.source_site;
    const filename = row.source_filename || row.original_title || 'source file';
    if (existing) {
      if (!existing.usedFor.includes(use)) existing.usedFor.push(use);
      if (!existing.sourcePages.includes(page)) existing.sourcePages.push(page);
      if (!existing.filenames.includes(filename)) existing.filenames.push(filename);
      continue;
    }
    byOwner.set(row.credit, {
      owner: row.credit,
      sourceSite: row.source_site,
      sourcePages: [page],
      usedFor: [use],
      filenames: [filename],
      note:
        row.restrictions?.trim() ||
        'Formal usage authorization still required. No public license is claimed.',
    });
  }
  return [...byOwner.values()].sort((a, b) => a.owner.localeCompare(b.owner));
}

export default function PhotoCreditsPage() {
  const credits = uniqueOpenLicenseCredits(rightsDoc.assets as RightsRow[]);
  const pending = pendingLibraryCredits(rightsDoc.assets as RightsRow[]);

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Photo credits', href: '/photo-credits/' }]} />
      <PageHeader
        eyebrow="Attribution"
        title="Photo credits"
        intro="Openly licensed photographs used on this site are listed below. Creative Commons images require attribution; Pexels License images do not, but are listed for completeness. Destination-library assets awaiting formal authorization are listed separately — no public license is claimed for those. Cropping or resizing is noted. Photographers and rights holders do not endorse NASHVILLE."
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
            Destination library assets (authorization pending)
          </h2>
          <p className="text-small leading-relaxed text-ink-soft">
            These files were obtained from the Nashville CVC Media Library or Four Seasons Nashville
            press library for the selected homepage and neighborhood replacements. They are recorded
            here for chain-of-custody; a public license is not claimed until formal usage
            authorization is confirmed.
          </p>
          {pending.map((item) => (
            <article key={item.owner} className="border-b border-paper-edge pb-6">
              <h3 className="font-sans text-lg font-bold text-ink">{item.owner}</h3>
              <ul className="mt-3 space-y-1.5 text-small leading-relaxed text-ink-soft">
                <li>
                  <span className="font-medium text-ink">Library:</span> {item.sourceSite}
                </li>
                <li>
                  <span className="font-medium text-ink">Used for:</span> {item.usedFor.join('; ')}
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
