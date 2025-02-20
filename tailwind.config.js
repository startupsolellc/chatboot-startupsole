// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}", // React bileşenlerini tarar
    ],
    theme: {
      extend: {
        colors: {
          primary: '#0066cc', // Startupsole.com mavi tonu
          secondary: '#ffcc00', // Vurgulayıcı renk (sarı)
          dark: '#333333', // Koyu renk tonu
          light: '#f4f4f4', // Açık gri arkaplan
        },
      },
    },
    plugins: [],
  };
  