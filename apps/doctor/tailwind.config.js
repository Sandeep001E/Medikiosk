import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename).replace(/\\/g, '/');

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    `${__dirname}/index.html`,
    `${__dirname}/src/**/*.{js,ts,jsx,tsx}`,
  ],
  theme: {
    extend: {
      colors: {
        // Sophisticated Medical Slate Navy Palette centered on #2B4A8A
        blue: {
          50: '#F0F4FA',
          100: '#DCE4F2',
          200: '#B8C9E6',
          300: '#8FAADC',
          400: '#5C84C9',
          500: '#3D64AF',
          600: '#2B4A8A', // PRIMARY BRAND #2B4A8A
          700: '#223B6E',
          800: '#1A2D54',
          900: '#13213E',
          950: '#0C1527'
        },
        sky: {
          50: '#F0F4FA',
          100: '#DCE4F2',
          200: '#B8C9E6',
          300: '#8FAADC',
          400: '#5C84C9',
          500: '#3D64AF',
          600: '#2B4A8A', // PRIMARY BRAND #2B4A8A
          700: '#223B6E',
          800: '#1A2D54',
          900: '#13213E',
          950: '#0C1527'
        },
        medikiosk: {
          50: '#F0F4FA',
          100: '#DCE4F2',
          200: '#B8C9E6',
          300: '#8FAADC',
          400: '#5C84C9',
          500: '#2B4A8A',
          600: '#223B6E',
          700: '#1A2D54',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
