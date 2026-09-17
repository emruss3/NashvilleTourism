import type { Config } from 'tailwindcss';

/**
 * Design tokens — NSVL "Black / Cream" scheme (owner's pick over the v1.3
 * Paper White / Charcoal Ink pair). Three tones: near-white page, warm cream
 * for the masthead, secondary panels and the planner band, and true black for
 * text, buttons, the discovery band and the footer. Supporting neutrals serve
 * borders and muted text.
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
          DEFAULT: '#FCFBF8', // page and card surface: warm near-white
          card: '#FCFBF8', // cards sit flat on the page, separated by borders
          sunk: '#EDE2CF', // Cream — masthead, secondary panels, form surfaces, planner band
          edge: '#E3DFD5', // Border — decorative dividers, never the sole control boundary
        },
        ink: {
          DEFAULT: '#111111', // Black — text, logo, dark bands, primary buttons
          soft: '#5E5E5E', // Muted — supporting text
          faint: '#5E5E5E', // metadata (same tone; hierarchy comes from size and weight)
          body: '#111111',
        },
        clay: {
          // Legacy accent token. NSVL v1.3 has no third brand color: links and
          // selected states use contextual ink with borders, underlines and
          // labels. Everything that used the old accent now resolves to ink.
          DEFAULT: '#111111',
          deep: '#2B2B2B',
          bright: '#111111',
          wash: '#EDE2CF',
        },
        navy: {
          DEFAULT: '#111111', // dark bands and primary buttons
          deep: '#2B2B2B', // hover for black fills
        },
        cumberland: {
          DEFAULT: '#111111',
        },
        sky: {
          DEFAULT: '#EDE2CF',
        },
        dogwood: {
          DEFAULT: '#EDE2CF',
        },
        mint: {
          DEFAULT: '#EDE2CF',
          wash: '#EDE2CF',
        },
        moss: {
          // Functional positive / verified tone
          DEFAULT: '#2F6B55',
          wash: '#E6EDE6',
        },
        golden: {
          DEFAULT: '#111111',
          wash: '#EDE2CF',
        },
        gold: {
          // Sponsored labels — muted, functional
          DEFAULT: '#6E5A2A',
          wash: '#EDE2CF',
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
        shell: '1440px',
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
