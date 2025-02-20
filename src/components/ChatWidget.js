// src/components/ChatWidget.js

import React, { useState } from 'react';
import {
  Box, Button, Input, Flex, Text, IconButton, useDisclosure
} from '@chakra-ui/react';
import { Send, MessageCircle } from 'lucide-react';

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
    <Box position="fixed" bottom="20px" right="20px" zIndex="1000">
      {!isOpen ? (
        <IconButton
          icon={<MessageCircle />}
          colorScheme="primary"
          onClick={toggleChat}
          size="lg"
          isRound
        />
      ) : (
        <Box bg="white" boxShadow="md" borderRadius="md" w="300px" h="400px" p="4">
          <Flex justifyContent="space-between" alignItems="center" mb="4">
            <Text fontSize="lg" fontWeight="bold" color="primary">
              Chatboot
            </Text>
            <Button size="sm" onClick={toggleChat} colorScheme="red">
              Kapat
            </Button>
          </Flex>

          <Box flex="1" overflowY="auto" mb="4">
            {messages.map((msg, index) => (
              <Box
                key={index}
                bg={msg.sender === 'user' ? 'primary' : 'gray.200'}
                color={msg.sender === 'user' ? 'white' : 'black'}
                p="2"
                borderRadius="md"
                mb="2"
                maxW="80%"
                alignSelf={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
              >
                {msg.text}
              </Box>
            ))}
          </Box>

          <Flex>
            <Input
              placeholder="Bir mesaj yaz..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              mr="2"
            />
            <IconButton
              icon={<Send />}
              colorScheme="primary"
              onClick={handleSend}
            />
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default ChatWidget;
