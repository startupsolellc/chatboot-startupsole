// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066cc',
        secondary: '#ffcc00',
        dark: '#333333',
        light: '#f4f4f4',
      },
    },
  },
  plugins: [],
};
