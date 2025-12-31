/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scroll: {
          beige: '#F5F5DC',
          dark: '#1a1a1a',
          darker: '#0a0a0a',
        },
        sne: {
          neon: '#00ff88',
          cyan: '#00d4ff',
          purple: '#6366f1',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}

