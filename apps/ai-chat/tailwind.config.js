/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          900: '#0a0c0f',
          800: '#12161c',
          700: '#1a1f28',
          600: '#242b38',
          500: '#2e3847',
          400: '#3d4a5c',
          300: '#52617a',
          200: '#7a8ba8',
          100: '#a8b5cc',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          dim: '#0e7490',
          glow: '#22d3ee',
        },
        amber: {
          DEFAULT: '#f59e0b',
          dim: '#92400e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
