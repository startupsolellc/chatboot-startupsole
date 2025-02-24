import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MessageCircle } from 'lucide-react';
import parse from 'html-react-parser';
import CloseIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';

const primaryColor = '#9b87f5';
const secondaryColor = '#7E69AB';
const darkColor = '#333333';
const userMessageBackground = '#D6BCFA';
const botMessageBackground = '#D3E4FD';
const userTextColor = '#333333';
const botTextColor = '#333333';

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

const ChatButton = styled.button`
  background-color: ${primaryColor};
  border: none;
  border-radius: 50%;
  padding: 20px;
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(155, 135, 245, 0.2);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${secondaryColor};
    transform: translateY(-2px);
    box-shadow: 0 12px 20px rgba(155, 135, 245, 0.3);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const ChatBox = styled.div`
  width: 90vw;
  max-width: 400px;
  height: 60vh;
  max-height: 600px;
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Header = styled.div`
  background-color: ${primaryColor};
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #F8F9FF;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #F8F9FF;
  }

  &::-webkit-scrollbar-thumb {
    background: ${primaryColor}40;
    border-radius: 3px;
  }
`;

const Message = styled.div`
  background-color: ${({ isUser }) => (isUser ? userMessageBackground : botMessageBackground)};
  color: ${({ isUser }) => (isUser ? userTextColor : botTextColor)};
  padding: 12px 16px;
  border-radius: 16px;
  margin-bottom: 12px;
  max-width: 75%;
  align-self: ${({ isUser }) => (isUser ? 'flex-end' : 'flex-start')};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  line-height: 1.5;
  position: relative;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }

  a {
    color: ${primaryColor};
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
`;

const LoadingMessage = styled.div`
  background-color: ${({ isUser }) => (isUser ? '#E9E3FF' : '#EBF3FF')};
  padding: 12px;
  border-radius: 16px;
  width: ${({ width }) => width || '60%'};
  height: 24px;
  animation: pulse 1.5s infinite;
  align-self: ${({ isUser }) => (isUser ? 'flex-end' : 'flex-start')};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  @keyframes pulse {
    0% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.3;
    }
    100% {
      opacity: 0.6;
    }
  }
`;

const InputContainer = styled.div`
  display: flex;
  padding: 16px;
  border-top: 1px solid rgba(155, 135, 245, 0.1);
  background-color: white;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${primaryColor}20;
  border-radius: 12px;
  margin-right: 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  outline: none;

  &:focus {
    border-color: ${primaryColor};
    box-shadow: 0 0 0 3px ${primaryColor}20;
  }

  &::placeholder {
    color: #9BA3AF;
  }
`;

const SendButton = styled.button`
  background-color: ${primaryColor};
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${secondaryColor};
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || '');
  const [isLoading, setIsLoading] = useState(true);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (sessionId) {
        try {
          setIsLoading(true);
          const response = await fetch('https://startupsolechatboot.netlify.app/.netlify/functions/mainChatbotHandler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'session-id': sessionId },
            body: JSON.stringify({ userMessage: '', sessionId }),
          });
          const data = await response.json();
          if (Array.isArray(data.message)) {
            setMessages(data.message);
          }
        } catch (error) {
          console.error('Mesajları Yüklerken Hata:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [sessionId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    try {
      const response = await fetch('https://startupsolechatboot.netlify.app/.netlify/functions/mainChatbotHandler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'session-id': sessionId || '' },
        body: JSON.stringify({ userMessage: input, sessionId }),
      });
      const data = await response.json();
      if (Array.isArray(data.message)) {
        setMessages(data.message);
      }
      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('sessionId', data.sessionId);
      }
    } catch (error) {
      console.error('Mesaj Gönderme Hatası:', error);
    }
  };

  return (
    <GlobalStyle>
      <ChatContainer>
        {!isOpen && <ChatButton onClick={toggleChat} aria-label="Sohbeti Aç"><MessageCircle size={24} /></ChatButton>}
        {isOpen && (
          <ChatBox>
            <Header>Startupsole Asistan<button onClick={toggleChat} aria-label="Sohbeti Kapat"><CloseIcon /></button></Header>
            <MessagesContainer>
              {isLoading ? (
                <LoadingContainer>
                  <LoadingMessage width="50%" />
                  <LoadingMessage isUser width="70%" />
                  <LoadingMessage width="60%" />
                  <LoadingMessage isUser width="40%" />
                </LoadingContainer>
              ) : (
                messages.map((msg, index) => (
                  <Message key={index} isUser={msg.role === 'user'}>
                    {msg.content}
                  </Message>
                ))
              )}
            </MessagesContainer>
            <InputContainer>
              <Input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Mesajınızı yazın..." 
              />
              <SendButton onClick={handleSend}><SendIcon /></SendButton>
            </InputContainer>
          </ChatBox>
        )}
      </ChatContainer>
    </GlobalStyle>
  );
};

export default ChatWidget;
