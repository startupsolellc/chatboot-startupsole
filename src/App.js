// src/App.js

import React from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import ChatWidget from './components/ChatWidget';

// Startupsole.com renklerine uygun tema tanımı
const theme = extendTheme({
  colors: {
    primary: '#0066cc', // Mavi renk
    secondary: '#ffcc00', // Sarı renk
    dark: '#333333', // Koyu renk tonu
    light: '#f4f4f4', // Açık gri arkaplan
  },
});

function App() {
  return (
    <ChakraProvider theme={theme}>
      <ChatWidget />
    </ChakraProvider>
  );
}

export default App;
