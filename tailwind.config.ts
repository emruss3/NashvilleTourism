import type { Config } from 'tailwindcss';

/**
 * Design tokens — NASHVILLE updated brand guide §4–5.
 * Light-first: Porch Cream / Soft White dominant, navy as anchor, coral for commerce.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F8F3E9', // Porch Cream — page background
          sunk: '#F8F3E9', // deprecated alias of paper — do not use as a fourth surface
          edge: '#D5DCE0', // cool hairline on light grounds
          card: '#FFFDFC', // Soft White
        },
        ink: {
          DEFAULT: '#102A43', // Nashville Navy — logo, nav, headings
          soft: '#3D5166', // secondary text
          faint: '#5C6B7A', // metadata
          body: '#232323', // Charcoal — body copy
        },
        clay: {
          DEFAULT: '#D95D45', // Clay Coral — primary actions
          deep: '#C24A34', // hover
          wash: '#F2B7AE', // Dogwood Pink
        },
        navy: {
          DEFAULT: '#102A43',
          deep: '#0B1F33',
        },
        cumberland: {
          DEFAULT: '#214A72',
        },
        sky: {
          DEFAULT: '#DDECEF',
        },
        dogwood: {
          DEFAULT: '#F2B7AE',
        },
        mint: {
          DEFAULT: '#8FC4AD', // Park Mint
          wash: '#E5F3EC',
        },
        moss: {
          // Alias for verification / positive — maps to Park Mint system
          DEFAULT: '#2F6B55', // darker mint for text on light
          wash: '#E5F3EC',
        },
        golden: {
          DEFAULT: '#E8B64A',
          wash: '#FBF3DE',
        },
        gold: {
          // Sponsored labels — muted, not luxury gold
          DEFAULT: '#8A6A1A',
          wash: '#FBF3DE',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        meta: ['0.8125rem', { lineHeight: '1.4' }],
        small: ['0.9375rem', { lineHeight: '1.55' }],
        body: ['1.0625rem', { lineHeight: '1.65' }],
        lead: ['1.1875rem', { lineHeight: '1.5' }],
        title: ['1.625rem', { lineHeight: '1.2', letterSpacing: '-0.012em' }],
        display: ['2.125rem', { lineHeight: '1.14', letterSpacing: '-0.015em' }],
        hero: ['2.75rem', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
      },
      maxWidth: {
        prose: '68ch',
        shell: '1200px',
      },
      borderRadius: {
        card: '6px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,42,67,0.05), 0 1px 12px rgba(16,42,67,0.04)',
        lift: '0 4px 24px rgba(16,42,67,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
