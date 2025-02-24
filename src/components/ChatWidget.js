// src/components/ChatWidget.js

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MessageCircle } from 'lucide-react';
import parse from 'html-react-parser';
import CloseIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';
import { v4 as uuidv4 } from 'uuid';

const primaryColor = '#3F77AE';
const secondaryColor = '#ffcc00';
const darkColor = '#333333';
const userMessageBackground = '#f1f1f1';
const botMessageBackground = '#e0f7fa';
const userTextColor = darkColor;
const botTextColor = primaryColor;

const GlobalStyle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
`;

const ChatContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
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
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || uuidv4());

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
        setSessionId(storedSessionId);
    } else {
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        localStorage.setItem('sessionId', newSessionId);
    }
  }, []);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage, { sender: 'bot', text: 'Yanıt hazırlanıyor...' }]);
    setInput('');

    try {
      const response = await fetch('https://startupsolechatboot.netlify.app/.netlify/functions/mainChatbotHandler', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'session-id': sessionId 
        },
        body: JSON.stringify({ userMessage: input, sessionId }),
      });

      const data = await response.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('sessionId', data.sessionId);
      }

      setMessages((prevMessages) => [
        ...prevMessages.slice(0, prevMessages.length - 1),
        { sender: 'bot', text: data.message?.slice(0, 200) || 'Maalesef şu anda yanıt veremiyorum.' }
      ]);
    } catch (error) {
      console.error('Sunucu Hatası:', error);
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, prevMessages.length - 1),
        { sender: 'bot', text: 'Maalesef şu anda yanıt veremiyorum.' }
      ]);
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
