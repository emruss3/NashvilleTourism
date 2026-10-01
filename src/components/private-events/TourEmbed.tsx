/**
 * A venue's virtual tour. Matterport links embed in place (their player is
 * an iframe); any other tour URL is a plain link, never an embed we have not
 * checked. No script, no dependency.
 */
export function matterportEmbedUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!/(^|\.)matterport\.com$/i.test(u.hostname) || !u.pathname.startsWith('/show')) return undefined;
    const model = u.searchParams.get('m');
    if (!model || !/^[A-Za-z0-9]{6,20}$/.test(model)) return undefined;
    return `https://my.matterport.com/show/?m=${model}&play=0&qs=1&brand=0`;
  } catch {
    return undefined;
  }
}

export default function TourEmbed({ url, name }: { url?: string; name: string }) {
  const embed = matterportEmbedUrl(url);
  if (!url) return null;
  if (!embed) {
    return (
      <p className="text-[15px]">
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-[0.2em]">
          Take the virtual tour<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    );
  }
  return (
    <figure className="space-y-2">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-card bg-ink">
        <iframe src={embed} title={`${name} virtual tour`} className="absolute inset-0 h-full w-full" loading="lazy" allow="xr-spatial-tracking; fullscreen" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-soft">
        <span>3D tour supplied by the venue. Drag to look around; tap the circles to move.</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-[0.2em]">
          Open full screen<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </figcaption>
    </figure>
  );
}
