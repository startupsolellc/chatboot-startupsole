// src/components/ChatWidget.js

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MessageCircle } from 'lucide-react';
import parse from 'html-react-parser';
import CloseIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';

// Startupsole.com renkleri
const primaryColor = '#3F77AE';
const secondaryColor = '#ffcc00';
const darkColor = '#333333';
const userMessageBackground = '#f1f1f1';
const botMessageBackground = '#e0f7fa';
const userTextColor = darkColor;
const botTextColor = primaryColor;

// Global font ayarı
const GlobalStyle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; /* Hem mobil hem de masaüstü için optimum font boyutu */
`;

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
  padding: 20px;
  color: white;
  cursor: pointer;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;

  &:hover {
    background-color: ${secondaryColor};
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const ChatBox = styled.div`
  width: 90vw;
  max-width: 400px;
  height: 50vh;
  max-height: 600px;
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
  background-color: #F4F7FF;
`;

const Message = styled.div`
  background-color: ${({ isUser }) => (isUser ? userMessageBackground : botMessageBackground)};
  color: ${({ isUser }) => (isUser ? userTextColor : botTextColor)};
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 5px;
  max-width: 70%;
  align-self: ${({ isUser }) => (isUser ? 'flex-end' : 'flex-start')};

  a {
    color: ${secondaryColor};
    text-decoration: none;
  }
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

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ sender: 'bot', text: 'Merhaba! Size nasıl yardımcı olabilirim?' }]);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    const newMessages = [...messages, userMessage, { sender: 'bot', text: 'Yanıt hazırlanıyor...' }];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await fetch('https://startupsolechatboot.netlify.app/.netlify/functions/mainChatbotHandler.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: input }),
      });

      const data = await response.json();

      const botMessage = {
        sender: 'bot',
        text: data.message || 'Maalesef şu anda yanıt veremiyorum.',
      };

      setMessages([...messages, userMessage, botMessage]);
    } catch (error) {
      console.error('Sunucu Hatası:', error);
      const errorMessage = { sender: 'bot', text: 'Maalesef şu anda yanıt veremiyorum.' };
      setMessages([...messages, errorMessage]);
    }
  };

  return (
    <GlobalStyle>
      <ChatContainer>
        {!isOpen && (
          <ChatButton onClick={toggleChat} aria-label="Sohbeti Aç">
            <MessageCircle size={24} />
          </ChatButton>
        )}

        {isOpen && (
          <ChatBox>
            <Header>
              Startupsole Asistan
              <button onClick={toggleChat} aria-label="Sohbeti Kapat">
                <CloseIcon />
              </button>
            </Header>

            <MessagesContainer>
              {messages.map((msg, index) => (
                <Message key={index} isUser={msg.sender === 'user'}>
                  {msg.sender === 'bot' ? parse(msg.text) : msg.text}
                </Message>
              ))}
            </MessagesContainer>

            <InputContainer>
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Mesajınızı yazın..."
              />
              <SendButton onClick={handleSend}>
                <SendIcon />
              </SendButton>
            </InputContainer>
          </ChatBox>
        )}
      </ChatContainer>
    </GlobalStyle>
  );
};

export default ChatWidget;
