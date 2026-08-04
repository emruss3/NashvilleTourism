import type { Config } from 'tailwindcss';

/**
 * Design system tokens.
 * Direction: editorial travel. Warm neutral paper, near-black ink,
 * one restrained clay accent. No gradients, no neon, no black-and-gold.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FCFAF7', // page background
          sunk: '#F4F0EA', // alternating sections
          edge: '#E7E1D8', // hairline borders
        },
        ink: {
          DEFAULT: '#17140F', // headings + body
          soft: '#4A443B', // secondary text — 9.24:1 on paper
          // 5.69:1 on paper, 5.22:1 on paper-sunk. Do not lighten past this:
          // the previous #7D7568 measured 4.37:1 and failed WCAG AA.
          faint: '#6B6355',
        },
        clay: {
          DEFAULT: '#A8452A', // primary accent / links
          deep: '#83341F', // hover
          wash: '#F6EAE4', // tinted backgrounds
        },
        moss: {
          DEFAULT: '#2F5D50', // verification / positive
          wash: '#E8F0ED',
        },
        gold: {
          // Sponsored labels. Muted, not luxury gold. 5.42:1 on gold-wash;
          // the previous #8A6A1F measured 4.44:1 and failed WCAG AA.
          DEFAULT: '#7A5D18',
          wash: '#F7F0DD',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      maxWidth: {
        prose: '68ch',
        shell: '1200px',
      },
      borderRadius: {
        // Restrained: cards are near-square, not pill-shaped.
        card: '4px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,20,15,0.05), 0 1px 12px rgba(23,20,15,0.04)',
        lift: '0 4px 24px rgba(23,20,15,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
