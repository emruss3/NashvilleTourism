import type { Config } from 'tailwindcss';

/**
 * Design tokens — NSVL brand guide §4 (design/nsvl-brand-handoff).
 * Two brand colors only: Paper White and Charcoal Ink (v1.3 palette
 * correction removed the vermilion accent). Supporting neutral tones serve
 * borders, muted text and secondary surfaces.
 *
 * Token names are kept from the previous system so existing components keep
 * working; their values now resolve to the NSVL palette.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F5F3ED', // Paper White — page and card surface
          card: '#F5F3ED', // cards sit flat on the page, separated by borders
          sunk: '#EAE7DE', // Soft Paper — secondary panels and form surfaces
          edge: '#D5D7CE', // Border — decorative dividers, never the sole control boundary
        },
        ink: {
          DEFAULT: '#1F2421', // Charcoal Ink — text, logo, dark bands, primary buttons
          soft: '#59605A', // Muted Ink — supporting text
          faint: '#59605A', // metadata (same tone; hierarchy comes from size and weight)
          body: '#1F2421',
        },
        clay: {
          // Legacy accent token. NSVL v1.3 has no third brand color: links and
          // selected states use contextual ink with borders, underlines and
          // labels. Everything that used the old accent now resolves to ink.
          DEFAULT: '#1F2421',
          deep: '#141816',
          bright: '#1F2421',
          wash: '#EAE7DE',
        },
        navy: {
          DEFAULT: '#1F2421', // dark bands and primary buttons
          deep: '#141816', // hover for charcoal fills
        },
        cumberland: {
          DEFAULT: '#1F2421',
        },
        sky: {
          DEFAULT: '#EAE7DE',
        },
        dogwood: {
          DEFAULT: '#EAE7DE',
        },
        mint: {
          DEFAULT: '#EAE7DE',
          wash: '#EAE7DE',
        },
        moss: {
          // Functional positive / verified tone
          DEFAULT: '#2F6B55',
          wash: '#E6EDE6',
        },
        golden: {
          DEFAULT: '#1F2421',
          wash: '#EAE7DE',
        },
        gold: {
          // Sponsored labels — muted, functional
          DEFAULT: '#6E5A2A',
          wash: '#EAE7DE',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Arial', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],
        meta: ['0.8125rem', { lineHeight: '1.4' }],
        small: ['0.9375rem', { lineHeight: '1.55' }],
        body: ['1.0625rem', { lineHeight: '1.6' }],
        lead: ['1.1875rem', { lineHeight: '1.5' }],
        title: ['1.625rem', { lineHeight: '1.1', letterSpacing: '-0.035em' }],
        display: ['2.25rem', { lineHeight: '1.06', letterSpacing: '-0.04em' }],
        hero: ['clamp(2.5rem, 6vw, 5.5rem)', { lineHeight: '1.02', letterSpacing: '-0.045em' }],
      },
      maxWidth: {
        prose: '68ch',
        shell: '1280px',
      },
      borderRadius: {
        card: '2px',
      },
      boxShadow: {
        card: 'none',
        lift: 'none',
      },
      transitionDuration: {
        DEFAULT: '160ms',
      },
    },
  },
  plugins: [],
};

export default config;
