// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 'chatboot-widget' div'inin var olup olmadığını kontrol et
const widgetRoot = document.getElementById('chatboot-widget');

if (widgetRoot) {
  const root = ReactDOM.createRoot(widgetRoot);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('chatboot-widget elementi bulunamadı.');
}
