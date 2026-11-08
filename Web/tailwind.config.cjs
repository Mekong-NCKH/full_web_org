/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
const daisyui = require('daisyui');

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        'custom-yellow': '4px 4px 0px 0px #F9BA08',
        'for-header': '0px 4px 16px 0px #00000040',
      },
      screens: {
        '2xs': '360px',
        xs: '480px',
        sm: '640px',
        md: '760px',
        lg: '960px',
        xl: '1240px',
        '2xl': '1536px',
        '3xl': '1728px',
        '4xl': '1920px',
      },
      colors: {
        // NEUTRAL THEME
        white: '#FFFFFF',
        black: '#000000',

        // PROJECT THEME
        primary: '#0B2878',
        'primary-300': '#6D7EAE',
        'primary-700': '#082060',

        // Secondary
        secondary: '#5C5B51',
        'secondary-300': '#949176',
        'secondary-700': '#393936',

        // tertiary
        tertiary: '#5C5B51',
        'tertiary-300': '#949176',
        'tertiary-700': '#393936',
      },
      dropShadow: {
        'secondary-1': '4px 4px 0px rgba(249, 186, 8, 1)',
        'secondary-2': '8px 8px 0px rgba(249, 186, 8, 1)',
        'secondary-4': '16px 16px 0px rgba(249, 186, 8, 1)',
      },
    },
  },

  // DaisyUI configuration
  daisyui: {
    styled: true,
    themes: [
      {
        'bk-theme': {
          primary: '#0B2878',
          'primary-content': '#ffffff',
          secondary: '#5C5B51',
          'secondary-content': '#ffffff',
          accent: '#F9BA08',
          neutral: '#FFFFFF',
          'base-100': '#ffffff',
          info: '#6D7EAE',
          success: '#069843',
          warning: '#F59E0B',
          error: '#DC2626',
        },
      },
      'light',
      'dark',
    ],
    base: true,
    utils: true,
    logs: false,
    rtl: false,
    darkTheme: 'dark',
  },

  plugins: [
    require('@tailwindcss/forms'),
    daisyui,
    // require('tailwind-scrollbar-hide'),
  ],
};
