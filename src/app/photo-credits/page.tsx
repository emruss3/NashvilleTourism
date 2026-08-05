import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';
import rightsDoc from '../../../docs/media/ASSET-RIGHTS.json';

export const metadata = buildMetadata({
  title: 'Photo credits',
  description:
    'Attribution for Creative Commons photographs used on NASHVILLE. Cropping and resizing are noted; photographers do not endorse this site.',
  path: '/photo-credits/',
});

const LICENSE_URLS: Record<string, string> = {
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
};

type RightsRow = {
  credit?: string | null;
  source_page?: string | null;
  license?: string | null;
  recommended_use?: string | null;
  rights_status?: string | null;
  derivative_notes?: string | null;
};

type Credit = {
  photographer: string;
  sourcePage: string;
  licenseName: string;
  licenseUrl: string;
  usedFor: string[];
  changes: string;
};

function uniqueOpenLicenseCredits(rows: RightsRow[]): Credit[] {
  const bySource = new Map<string, Credit>();

  for (const row of rows) {
    if (row.rights_status !== 'approved-open-license') continue;
    if (!row.credit || !row.source_page || !row.license) continue;

    const licenseUrl = LICENSE_URLS[row.license];
    if (!licenseUrl) continue;

    const key = `${row.source_page}::${row.credit}`;
    const existing = bySource.get(key);
    const use = row.recommended_use?.trim() || 'Editorial photography';
    const changes =
      row.derivative_notes?.trim() ||
      'Cropped and resized for web placement; no generative editing.';

    if (existing) {
      if (!existing.usedFor.includes(use)) existing.usedFor.push(use);
      continue;
    }

    bySource.set(key, {
      photographer: row.credit,
      sourcePage: row.source_page,
      licenseName: row.license,
      licenseUrl,
      usedFor: [use],
      changes,
    });
  }

  return [...bySource.values()].sort(
    (a, b) =>
      a.photographer.localeCompare(b.photographer) || a.sourcePage.localeCompare(b.sourcePage),
  );
}

export default function PhotoCreditsPage() {
  const credits = uniqueOpenLicenseCredits(rightsDoc.assets as RightsRow[]);

  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Photo credits', href: '/photo-credits/' }]} />
      <PageHeader
        eyebrow="Attribution"
        title="Photo credits"
        intro="Openly licensed photographs used on this site require attribution. Cropping or resizing is noted below. Photographers and rights holders do not endorse NASHVILLE."
      />

      <section className="max-w-3xl space-y-8 py-8">
        {credits.map((credit) => (
          <article key={credit.sourcePage} className="border-b border-paper-edge pb-6">
            <h2 className="font-sans text-lg font-bold text-ink">{credit.photographer}</h2>
            <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-ink-soft">
              <li>
                <span className="font-medium text-ink">Used for:</span> {credit.usedFor.join('; ')}
              </li>
              <li>
                <span className="font-medium text-ink">Source:</span>{' '}
                <a
                  href={credit.sourcePage}
                  className="text-clay underline hover:text-clay-deep"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {credit.sourcePage}
                </a>
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

      <p className="max-w-3xl text-sm text-ink-faint">
        Owned BPH photography used editorially on this site does not require public photographer
        attribution unless a specific agreement says otherwise. Full internal rights records live in
        the project documentation and are not published here.
      </p>
    </div>
  );
}
