// src/components/ChatWidget.js

import React, { useState } from 'react';
import styled from 'styled-components';
import { Send, MessageCircle } from 'lucide-react';

// Renk Tanımları (Startupsole.com renklerine uygun)
const primaryColor = '#0066cc';
const secondaryColor = '#ffcc00';
const darkColor = '#333333';
const lightColor = '#f4f4f4';

// Stil Bileşenleri
const ChatContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
`;

const ChatButton = styled.button`
  background-color: ${primaryColor};
  border: none;
  border-radius: 50%;
  padding: 10px;
  color: white;
  cursor: pointer;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: ${secondaryColor};
  }
`;

const ChatBox = styled.div`
  width: 300px;
  height: 400px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  background-color: ${primaryColor};
  color: white;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  background-color: ${lightColor};
`;

const Message = styled.div`
  background-color: ${({ isUser }) => (isUser ? primaryColor : '#e0e0e0')};
  color: ${({ isUser }) => (isUser ? 'white' : darkColor)};
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 5px;
  max-width: 70%;
  align-self: ${({ isUser }) => (isUser ? 'flex-end' : 'flex-start')};
`;

const InputContainer = styled.div`
  display: flex;
  padding: 10px;
  border-top: 1px solid #ddd;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-right: 10px;
`;

const SendButton = styled.button`
  background-color: ${primaryColor};
  border: none;
  border-radius: 5px;
  padding: 8px 12px;
  color: white;
  cursor: pointer;

  &:hover {
    background-color: ${secondaryColor};
  }
`;

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
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
