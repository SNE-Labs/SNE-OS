/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SNE Labs Design System Colors
        sne: {
          bg: '#0B0B0B',
          'surface-1': '#111216',
          'surface-elevated': '#1B1B1F',
          'text-primary': '#F7F7F8',
          'text-secondary': '#A6A6A6',
          accent: '#FF6A00',
          'accent-hover': '#E65A00',
          'accent-active': '#CC5800',
          success: '#00C48C',
          warning: '#FFC857',
          critical: '#FF4D4F',
        },
        // Legacy compatibility
        terminal: {
          bg: '#0B0B0B',
          fg: '#F7F7F8',
          border: 'rgba(255, 255, 255, 0.1)',
          accent: '#FF6A00',
          warning: '#FFC857',
          error: '#FF4D4F',
          success: '#00C48C',
          info: '#00C48C',
          purple: '#FF6A00',
        },
        dark: {
          bg: '#0B0B0B',
          card: '#111216',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: '#1B1B1F',
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

