/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SNE Labs Terminal Colors
        terminal: {
          bg: '#0a0a0a',
          fg: '#00ff00',
          border: 'rgba(0, 255, 0, 0.3)',
          accent: '#00ff00',
          warning: '#ffaa00',
          error: '#ff4444',
          success: '#00ff88',
          info: '#00aaff',
          purple: '#aa00ff',
        },
        dark: {
          bg: '#0a0a0a',
          card: '#1a1a1a',
          border: '#2a2a2a',
          hover: '#2a2a2a',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'Monaco', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 0, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 255, 0, 0.8)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

