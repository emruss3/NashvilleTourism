import HeroVideo from '@/components/HeroVideo';
import { asset as assetUrl } from '@/lib/seo';
import { site } from '@/lib/site';
import DiscoveryForm from './DiscoveryForm';

/**
 * Homepage opening, rendered once in the MOBILE-FIRST.md reading order:
 * introduction, search module, photograph.
 *
 * Phones: dark copy on paper, the search field and quick links, then the
 * skyline poster frame as a landscape photograph about 220px tall. No
 * autoplay video on phones.
 * Desktop (SITE-LAYOUT.md §Hero): the same frame is the full-bleed backdrop
 * with the daylight drone loop playing over it (poster first, pause control,
 * reduced-motion and data-saver respected). The copy sits on the left in
 * Paper White over a left-weighted charcoal scrim; the search module is the
 * charcoal discovery band beneath.
 */
export default function Hero() {
  const mobile = assetUrl('/media/hero/nashville-hero-drone-mobile-800.webp');
  const wide = `${assetUrl('/media/hero/nashville-hero-drone-poster-960.webp')} 960w, ${assetUrl('/media/hero/nashville-hero-drone-poster-1600.webp')} 1600w`;

  return (
    <section className="relative isolate" aria-labelledby="hero-title">
      <link rel="preload" as="image" media="(max-width: 767px)" href={mobile} fetchPriority="high" />
      <link rel="preload" as="image" media="(min-width: 768px)" imageSrcSet={wide} imageSizes="100vw" fetchPriority="high" />

      {/* 1. Introduction. On desktop this block sits over the backdrop. */}
      <div className="relative z-10 md:flex md:min-h-[500px] md:flex-col md:justify-end lg:min-h-[560px]">
        <div className="shell pt-6 md:pb-14 md:pt-20 lg:pb-16">
          <div className="max-w-[640px]">
            <p className="eyebrow md:text-paper/85">{site.heroEyebrow}</p>
            <h1
              id="hero-title"
              className="mt-2 text-[2.5rem] leading-[0.98] text-ink sm:text-[3rem] md:text-[4rem] md:text-paper lg:text-[5.25rem]"
            >
              {site.headline}
            </h1>
            <p className="mt-3 max-w-md text-[17px] text-ink-soft sm:text-lead md:text-[21px] md:text-paper/90">
              {site.headlineSupport}
            </p>
            <a href="#discover" className="btn-reverse mt-6 hidden min-h-14 px-7 text-base md:inline-flex">
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

      {/* 3. Photograph: in flow on phones, full-bleed backdrop with the loop on desktop. */}
      <figure className="shell mt-6 md:absolute md:inset-x-0 md:top-0 md:z-0 md:m-0 md:h-[500px] md:max-w-none md:p-0 lg:h-[560px]">
        <div className="relative overflow-hidden rounded-card bg-ink md:absolute md:inset-0 md:rounded-none">
          <picture>
            <source media="(max-width: 767px)" srcSet={mobile} type="image/webp" />
            <source srcSet={wide} sizes="100vw" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl('/media/hero/nashville-hero-drone-poster.jpg')}
              alt="Downtown Nashville at sunset above the Cumberland River and Korean Veterans Memorial Bridge."
              width={2400}
              height={1350}
              className="aspect-[16/9] h-auto w-full object-cover md:absolute md:inset-0 md:h-full md:object-[center_40%]"
              fetchPriority="high"
              decoding="sync"
            />
          </picture>
          <HeroVideo />
          <div
            className="hidden md:block md:absolute md:inset-0 md:bg-gradient-to-r md:from-ink/80 md:via-ink/35 md:to-ink/5"
            aria-hidden="true"
          />
        </div>
      </figure>
    </section>
  );
}
