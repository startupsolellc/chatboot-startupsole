// src/App.js

import React, { useState } from 'react';
import { OpenAI } from 'openai'; 

// OpenAI API anahtarı ile güvenli yapılandırma
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY, // Netlify'dan alınan anahtar
  dangerouslyAllowBrowser: false, // Güvenli kullanım (tarayıcıda gizli)
});

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
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: input }],
      });

      const botMessage = {
        sender: 'bot',
        text: response.choices[0].message.content,
      };

      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error('OpenAI API Hatası:', error);
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
