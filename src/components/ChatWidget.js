// src/components/ChatWidget.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { Send, MessageCircle } from 'lucide-react';

// Renk Tanımları
const primaryColor = '#0066cc';
const secondaryColor = '#ffcc00';
const darkColor = '#333333';
const lightColor = '#f4f4f4';

// Stil Bileşenleri (değişmedi, kısaltıyorum)
const ChatContainer = styled.div` /* ... */ `;
const ChatButton = styled.button` /* ... */ `;
const ChatBox = styled.div` /* ... */ `;
const Header = styled.div` /* ... */ `;
const MessagesContainer = styled.div` /* ... */ `;
const Message = styled.div` /* ... */ `;
const InputContainer = styled.div` /* ... */ `;
const Input = styled.input` /* ... */ `;
const SendButton = styled.button` /* ... */ `;

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await fetch('https://startupsolechatboot.netlify.app/.netlify/functions/openaiFirebaseProxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error(`HTTP Hatası: ${response.status}`);

      const data = await response.json();
      const botMessage = {
        sender: 'bot',
        text: data.message || 'Maalesef şu anda yanıt veremiyorum.',
      };
      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error('Sunucu Hatası:', error);
      const errorMessage = { sender: 'bot', text: 'Maalesef şu anda yanıt veremiyorum. Hata: ' + error.message };
      setMessages([...newMessages, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <ChatContainer>
      {!isOpen && (
        <ChatButton onClick={toggleChat}>
          <MessageCircle size={24} />
        </ChatButton>
      )}
      {isOpen && (
        <ChatBox>
          <Header>
            Chatboot
            <button onClick={toggleChat}>✖️</button>
          </Header>
          <MessagesContainer>
            {messages.map((msg, index) => (
              <Message key={index} isUser={msg.sender === 'user'}>
                {msg.text}
              </Message>
            ))}
          </MessagesContainer>
          <InputContainer>
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Bir mesaj yaz..."
            />
            <SendButton onClick={handleSend}>
              <Send size={20} />
            </SendButton>
          </InputContainer>
        </ChatBox>
      )}
    </ChatContainer>
  );
};

export default ChatWidget;