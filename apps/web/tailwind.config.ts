import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // OppDate brand palette · v2.0 (ginger ramp darkened for authority)
        ginger: {
          dark:  '#7A2D05',  // PRIMARY: CTAs, headings, "Date" wordmark
          mid:   '#B5520F',  // hover, "Warm" pillar, gradient top
          deep:  '#6E2F04',  // pressed, "Elevated" pillar, gradient bottom
          light: '#F5E6D8',  // tints, badges, hairlines on dark surfaces
          peach: '#F2C39E',  // first segment of the 5-band brand bar
        },
        slate: {
          deep:    '#2C4452',  // "Intelligent" pillar, dark header bars
          DEFAULT: '#3E5E6C',  // H2/H3 section headings on bands
          mid:     '#6A8089',  // dividers on slate surfaces
          soft:    '#9FAEB4',  // faint accent
          pale:    '#D7DEE1',  // hairlines on cool surfaces
        },
        ember: '#1A0F08',  // the one dark surface: hero, footer, OppDate Apply band
        ink: {
          DEFAULT: '#1F3242',  // body text (warm dark slate, never pure black)
          2:       '#3D5562',  // secondary body text
        },
        cream: {
          DEFAULT: '#FAF3EA',  // page background
          2:       '#F3E8D9',  // section bands, hover rows
          deep:    '#ECDBC4',  // logo-card backgrounds
        },
        muted: '#6A7B85',
        teal: {
          deep: '#0E7490',  // verified / info accent
        },
        // Semantic state (warm-tuned, never minty or neon)
        success: {
          DEFAULT: '#4B7A3E',
          bg:      '#ECF0E4',
        },
        warning: {
          DEFAULT: '#C4881C',
          bg:      '#FBF1DA',
        },
        error: {
          DEFAULT: '#A6321E',
          bg:      '#F7E2DC',
        },
        info: {
          DEFAULT: '#305B6E',
          bg:      '#E1ECF1',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display': ['clamp(2.5rem, 8vw, 4.5rem)',  { lineHeight: '0.98', letterSpacing: '-0.025em' }],
        'h1':      ['clamp(2.125rem, 6.5vw, 3.5rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        'h2':      ['2.5rem',  { lineHeight: '1.15', letterSpacing: '-0.025em' }],
        'h3':      ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'h4':      ['1.375rem',{ lineHeight: '1.3'  }],
        'h5':      ['1.125rem',{ lineHeight: '1.35' }],
      },
      borderRadius: {
        'sm':   '6px',
        'md':   '10px',   // buttons & inputs
        'lg':   '14px',   // cards
        'xl':   '20px',   // modals & drawers
        '2xl':  '28px',
        'pill': '62.5rem',
      },
      boxShadow: {
        'xs':         '0 1px 2px rgba(73, 42, 12, 0.06)',
        'sm':         '0 1px 2px rgba(73, 42, 12, 0.05), 0 2px 6px rgba(73, 42, 12, 0.05)',
        'md':         '0 4px 10px rgba(73, 42, 12, 0.06), 0 10px 24px rgba(73, 42, 12, 0.06)',
        'lg':         '0 12px 28px rgba(73, 42, 12, 0.10), 0 24px 60px rgba(73, 42, 12, 0.08)',
        'ginger':     '0 8px 24px rgba(122, 45, 5, 0.22)',
        'slate':      '0 8px 24px rgba(44, 68, 82, 0.18)',
        'ember':      '0 24px 60px rgba(0, 0, 0, 0.45), 0 8px 20px rgba(0, 0, 0, 0.35)',
        'opp-button': '0 5px 10px rgba(122, 45, 5, 0.10), 0 18px 18px rgba(122, 45, 5, 0.09), 0 41px 25px rgba(122, 45, 5, 0.05), 0 73px 29px rgba(122, 45, 5, 0.01)',
        'opp-card':   '0 1px 3px rgba(73, 42, 12, 0.06), 0 4px 12px rgba(73, 42, 12, 0.04)',
      },
      backgroundImage: {
        'grad-ginger': 'linear-gradient(135deg, #B5520F 0%, #7A2D05 55%, #6E2F04 100%)',
        'grad-cream':  'linear-gradient(180deg, #FAF3EA 0%, #F3E8D9 100%)',
        'band-5': 'linear-gradient(90deg, #F2C39E 0% 20%, #6A8089 20% 40%, #9FAEB4 40% 60%, #C8D2D6 60% 80%, #D7DEE1 80% 100%)',
        'ember-mesh': [
          'radial-gradient(60% 55% at 18% 12%,  rgba(181, 82, 15, 0.15) 0%, rgba(181, 82, 15, 0) 60%)',
          'radial-gradient(50% 50% at 88% 42%,  rgba(122, 45, 5, 0.10) 0%, rgba(122, 45, 5, 0) 62%)',
          'radial-gradient(70% 60% at 50% 108%, rgba(212, 114, 58, 0.08) 0%, rgba(212, 114, 58, 0) 60%)',
          'radial-gradient(120% 120% at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.45) 100%)',
        ].join(', '),
      },
      transitionTimingFunction: {
        'out-soft':    'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out-soft': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        '140': '140ms',
        '220': '220ms',
        '420': '420ms',
      },
    },
  },
  plugins: [],
}

export default config
