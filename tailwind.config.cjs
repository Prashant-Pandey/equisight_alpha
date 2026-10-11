/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        util: {
          bg: '#121212',
          surface: '#181818',
          subtle: '#222222',
          border: '#2e2e2e',
          'border-light': '#3a3a3a',
          text: '#e5e5e5',
          muted: '#8e8e8e',
          accent: '#0055ff',
          'accent-hover': '#0044cc',
          positive: '#00cc66',
          negative: '#ff3344',
          warning: '#ff9900'
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#0055ff',
          600: '#0044cc',
          700: '#0033aa',
          900: '#002277',
        },
        slate: {
          850: '#181818',
          950: '#121212'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '0px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        '3xl': '2px',
        full: '2px'
      },
      typography: (theme) => ({
        invert: {
          css: {
            '--tw-prose-body': '#d0d0d0',
            '--tw-prose-headings': '#ffffff',
            '--tw-prose-lead': '#a0a0a0',
            '--tw-prose-links': '#0055ff',
            '--tw-prose-bold': '#ffffff',
            '--tw-prose-counters': '#8e8e8e',
            '--tw-prose-bullets': '#8e8e8e',
            '--tw-prose-hr': '#2e2e2e',
            '--tw-prose-quotes': '#e5e5e5',
            '--tw-prose-quote-borders': '#0055ff',
            '--tw-prose-code': '#ffffff',
            '--tw-prose-pre-code': '#e5e5e5',
            '--tw-prose-pre-bg': '#181818',
            '--tw-prose-th-borders': '#2e2e2e',
            '--tw-prose-td-borders': '#222222',
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
