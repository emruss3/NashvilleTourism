import { asset as assetUrl } from '@/lib/seo';
import { site } from '@/lib/site';
import DiscoveryForm from './DiscoveryForm';

/**
 * Homepage opening, rendered once in the MOBILE-FIRST.md reading order:
 * introduction, search module, photograph.
 *
 * Phones: dark copy on paper, the search field and quick links, then one
 * landscape photograph about 220px tall.
 * Desktop (SITE-LAYOUT.md §Hero): the same photograph becomes a full-bleed
 * background behind the copy, which sits on the left in Paper White over a
 * restrained charcoal scrim, and the search module renders as the charcoal
 * discovery band directly beneath. The DOM never changes between the two.
 *
 * ASSET STATUS: interim photograph is BPH-owned (editorial/rooftop-party).
 * Replace with the commissioned hero when licensed; keep the file names.
 */
export default function Hero() {
  const mobile = assetUrl('/media/hero/nsvl-hero-rooftop-mobile-800.webp');
  const wide = `${assetUrl('/media/hero/nsvl-hero-rooftop-960.webp')} 960w, ${assetUrl('/media/hero/nsvl-hero-rooftop-1600.webp')} 1600w`;

  return (
    <section className="relative isolate" aria-labelledby="hero-title">
      <link rel="preload" as="image" media="(max-width: 767px)" href={mobile} fetchPriority="high" />
      <link rel="preload" as="image" media="(min-width: 768px)" imageSrcSet={wide} imageSizes="100vw" fetchPriority="high" />

      {/* 1. Introduction. On desktop this block sits over the photograph. */}
      <div className="relative z-10 md:flex md:min-h-[520px] md:flex-col md:justify-end lg:min-h-[600px]">
        <div className="shell pt-6 md:pb-14 md:pt-24 lg:pb-16">
          <div className="max-w-[520px]">
            <p className="eyebrow md:text-paper/85">{site.heroEyebrow}</p>
            <h1
              id="hero-title"
              className="mt-2 text-[2.5rem] leading-[1.02] text-ink sm:text-[3rem] md:text-paper lg:text-hero"
            >
              {site.headline}
            </h1>
            <p className="mt-3 max-w-md text-[17px] text-ink-soft sm:text-lead md:text-paper/90">
              {site.headlineSupport}
            </p>
            <a
              href="#discover"
              className="btn-reverse mt-6 hidden md:inline-flex"
            >
              Explore the city
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Search module: inline on phones, charcoal band on desktop. */}
      <div id="discover" className="relative z-10 md:bg-ink md:py-5 md:text-paper">
        <div className="shell pt-6 md:pt-0">
          <DiscoveryForm />
        </div>
      </div>

      {/* 3. Photograph: in flow on phones, full-bleed backdrop on desktop. */}
      <figure className="shell mt-6 md:absolute md:inset-x-0 md:top-0 md:bottom-[var(--band-h,0px)] md:z-0 md:m-0 md:h-[520px] md:max-w-none md:p-0 lg:h-[600px]">
        <picture>
          <source media="(max-width: 767px)" srcSet={mobile} type="image/webp" />
          <source srcSet={wide} sizes="100vw" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl('/media/editorial/rooftop-party.jpg')}
            alt="A crowd facing a rooftop stage at a downtown Nashville show at night."
            width={1600}
            height={1067}
            className="aspect-[16/9] h-auto w-full rounded-card object-cover md:absolute md:inset-0 md:h-full md:rounded-none md:object-[65%_center]"
            fetchPriority="high"
            decoding="sync"
          />
        </picture>
        {/* Charcoal scrim: heavier on the left where the copy sits, light over faces on the right. */}
        <div
          className="hidden md:block md:absolute md:inset-0 md:bg-gradient-to-r md:from-ink/85 md:via-ink/40 md:to-ink/10"
          aria-hidden="true"
        />
      </figure>
    </section>
  );
}
