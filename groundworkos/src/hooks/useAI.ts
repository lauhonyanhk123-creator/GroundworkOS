'use client';

import { useState, useCallback, useRef } from 'react';

type Message = {
  role: string;
  content?: string | null;
  [key: string]: any;
};

export function useAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'You are a helpful assistant for GroundworkOS, a UK groundwork company CRM. You can help with creating clients, managing jobs, quotes, invoices, and more. Use the available tools when needed.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userContent: string) => {
    setIsLoading(true);
    setError(null);
    
    const newMessage: Message = { role: 'user', content: userContent };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      setMessages([...updatedMessages, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        role: 'system',
        content: 'You are a helpful assistant for GroundworkOS, a UK groundwork company CRM. You can help with creating clients, managing jobs, quotes, invoices, and more. Use the available tools when needed.',
      },
    ]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
