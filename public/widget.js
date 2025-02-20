// public/widget.js

(function () {
  const script = document.currentScript;
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'chatboot-widget-container';
  document.body.appendChild(widgetContainer);

  const iframe = document.createElement('iframe');
  iframe.src = script.getAttribute('data-src');
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '350px';
  iframe.style.height = '500px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '1000';
  iframe.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
  iframe.style.borderRadius = '10px';
  iframe.style.backgroundColor = 'white';

  widgetContainer.appendChild(iframe);

  // Widget içindeki iframe ile mesajlaşma (OpenAI entegrasyonu)
  window.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'chatboot-message') {
          try {
              const response = await fetch('/.netlify/functions/openaiFirebaseProxy', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: event.data.message }),
              });
              const data = await response.json();
              iframe.contentWindow.postMessage({ type: 'chatboot-response', message: data.message }, '*');
          } catch (error) {
              console.error('Sunucu Hatası:', error);
              iframe.contentWindow.postMessage({ type: 'chatboot-response', message: 'Sunucu hatası, lütfen tekrar deneyin.' }, '*');
          }
      }
  });
})();
