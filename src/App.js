// src/App.js

import React, { useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');

    try {
      const response = await fetch('/.netlify/functions/openaiProxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      const botMessage = {
        sender: 'bot',
        text: data.message || 'Maalesef şu anda yanıt veremiyorum.',
      };

      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error('Sunucu Hatası:', error);
      const errorMessage = { sender: 'bot', text: 'Maalesef şu anda yanıt veremiyorum.' };
      setMessages([...newMessages, errorMessage]);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>OpenAI gpt-4o-mini Destekli Chatboot 🚀</h1>

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
