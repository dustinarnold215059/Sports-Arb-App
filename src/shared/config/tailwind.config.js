/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content paths that should be scanned for classes
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../shared/**/*.{js,ts,jsx,tsx,mdx}', // Include shared components
  ],
  
  // Dark mode configuration
  darkMode: 'class', // Use class-based dark mode
  
  theme: {
    extend: {
      // Sports Betting Brand Colors
      colors: {
        // Primary brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Main brand blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        
        // Success colors (for profitable arbitrage)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Main success green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        
        // Warning colors (for risky bets)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Main warning amber
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        
        // Danger colors (for losses/errors)
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Main danger red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        
        // Neutral grays for UI
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        
        // Bookmaker brand colors
        bookmaker: {
          draftkings: '#f3601b',
          betmgm: '#146734',
          fanduel: '#2d73c8',
          caesars: '#c8a962',
          pointsbet: '#ffd100',
          betrivers: '#004d9a',
        }
      },
      
      // Typography
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Roboto Mono',
          'source-code-pro',
          'Menlo',
          'Consolas',
          'DejaVu Sans Mono',
          'monospace',
        ],
      },
      
      // Custom spacing for betting interfaces
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Animation and transitions
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-green': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
      },
      
      // Box shadows for cards and elevation
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'colored': '0 4px 14px 0 rgba(59, 130, 246, 0.15)',
        'success': '0 4px 14px 0 rgba(34, 197, 94, 0.15)',
        'warning': '0 4px 14px 0 rgba(245, 158, 11, 0.15)',
        'danger': '0 4px 14px 0 rgba(239, 68, 68, 0.15)',
      },
      
      // Border radius for consistent UI
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      
      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // Custom gradients
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'profit-gradient': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'loss-gradient': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
      
      // Backdrop blur
      backdropBlur: {
        xs: '2px',
      },
      
      // Custom screens for sports betting layouts
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
    },
  },
  
  plugins: [
    // Form styling plugin
    require('@tailwindcss/forms')({
      strategy: 'class', // Use .form-input, .form-select, etc.
    }),
    
    // Typography plugin for rich text
    require('@tailwindcss/typography'),
    
    // Container queries
    require('@tailwindcss/container-queries'),
    
    // Custom plugin for sports betting utilities
    function({ addUtilities, addComponents, theme }) {
      // Add custom utilities
      addUtilities({
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.text-pretty': {
          'text-wrap': 'pretty',
        },
        // Arbitrage-specific utilities
        '.profit-text': {
          color: theme('colors.success.600'),
          fontWeight: '600',
        },
        '.loss-text': {
          color: theme('colors.danger.600'),
          fontWeight: '600',
        },
        '.odds-positive': {
          color: theme('colors.success.700'),
        },
        '.odds-negative': {
          color: theme('colors.danger.700'),
        },
      });
      
      // Add custom components
      addComponents({
        '.btn-arbitrage': {
          backgroundColor: theme('colors.success.600'),
          color: theme('colors.white'),
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.semibold'),
          boxShadow: theme('boxShadow.success'),
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme('colors.success.700'),
            transform: 'translateY(-1px)',
            boxShadow: theme('boxShadow.large'),
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        
        '.card-betting': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.soft'),
          border: `1px solid ${theme('colors.gray.200')}`,
          padding: theme('spacing.6'),
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme('boxShadow.medium'),
            transform: 'translateY(-2px)',
          },
          '@media (prefers-color-scheme: dark)': {
            backgroundColor: theme('colors.gray.800'),
            borderColor: theme('colors.gray.700'),
          },
        },
        
        '.input-odds': {
          textAlign: 'center',
          fontWeight: theme('fontWeight.semibold'),
          fontSize: theme('fontSize.lg'),
          padding: `${theme('spacing.3')} ${theme('spacing.4')}`,
          '&:focus': {
            boxShadow: `0 0 0 3px ${theme('colors.primary.500')}20`,
          },
        },
      });
    },
  ],
};