/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/design-system/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#121214',
          card: '#18191d',
          'card-hover': '#222328',
          elevated: '#202126',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-focus': 'rgba(245, 158, 11, 0.4)',
          muted: '#9ca3af',
        },
        dark: {
          bg: '#121214',
          surface: '#18191d',
          card: '#18191d',
          border: '#28292e',
          hover: '#222328',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.035em',
        tight: '-0.02em',
      },
    },
  },
  plugins: [],
}
