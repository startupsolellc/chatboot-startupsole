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
  
    widgetContainer.appendChild(iframe);
  })();
  