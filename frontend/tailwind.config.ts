import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      keyframes: {
        chartTip: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        landingFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        landingFadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        chartTip: 'chartTip 180ms ease-out',
        landingFloat: 'landingFloat 6s ease-in-out infinite',
        landingFadeUp: 'landingFadeUp 700ms ease-out both',
      },
      fontSize: {
        xs: ['10px', { lineHeight: '14px' }],
        sm: ['12px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '22px' }],
        lg: ['16px', { lineHeight: '26px' }],
        xl: ['18px', { lineHeight: '26px' }],
        '2xl': ['22px', { lineHeight: '30px' }],
        '3xl': ['28px', { lineHeight: '34px' }],
        '4xl': ['34px', { lineHeight: '38px' }],
      },
      colors: {
        canvas: '#F8F9FA',
        mint: '#E6F4F1',
        brand: {
          50: '#E6F4F1',
          100: '#D4EEF0',
          200: '#A8D5DB',
          500: '#4FA0AB',
          600: '#3D8A95',
          700: '#2F6F79',
          900: '#0f2a3d',
        },
        navy: {
          700: '#16324a',
          800: '#10263a',
          900: '#0b1c2c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
