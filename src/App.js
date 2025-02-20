// src/App.js

import React, { useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() === '') return;

    // Kullanıcı mesajını ekle
    const userMessage = { sender: 'user', text: input };
    const newMessages = [...messages, userMessage];

    // Basit Chatboot cevabı
    const botMessage = { sender: 'bot', text: 'Merhaba! Bu bir otomatik cevaptır.' };
    newMessages.push(botMessage);

    setMessages(newMessages);
    setInput('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Chatboot - Startupsole 🚀</h1>

      <div style={{ border: '1px solid #ddd', padding: '10px', height: '300px', overflowY: 'auto', marginBottom: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
            <p><strong>{msg.sender === 'user' ? 'Sen' : 'Chatboot'}:</strong> {msg.text}</p>
          </div>
        ))}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Bir mesaj yaz..."
        style={{ width: '80%', padding: '10px' }}
      />
      <button onClick={handleSend} style={{ padding: '10px' }}>Gönder</button>
    </div>
  );
}

export default App;
