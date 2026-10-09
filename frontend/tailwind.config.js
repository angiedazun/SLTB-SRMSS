/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F5',
          100: '#FED7D7',
          200: '#FEB2B2',
          300: '#FC8181',
          400: '#F56565',
          500: '#E53E3E',
          600: '#C53030',
          700: '#9B2C2C',
          DEFAULT: '#E53E3E',
        },
        indigo: {
          brand: '#C53030',
          dark: '#9B2C2C',
          light: '#FED7D7',
        },
        emerald: {
          brand: '#22C55E',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#FFF8F8',
          blue: '#FFF0F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(229, 62, 62, 0.12)',
        'glass-lg': '0 20px 60px rgba(229, 62, 62, 0.16)',
        soft: '0 2px 15px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 8px 40px rgba(0, 0, 0, 0.10)',
        card: '0 4px 24px rgba(197, 48, 48, 0.08)',
        'card-hover': '0 8px 32px rgba(197, 48, 48, 0.16)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
      },
    },
  },
  plugins: [],
};
