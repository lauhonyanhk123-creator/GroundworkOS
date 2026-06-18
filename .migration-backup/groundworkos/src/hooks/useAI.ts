'use client';

import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_MESSAGE: Message = {
  role: 'system',
  content: `You are the AI assistant for GroundworkOS, a CRM system for a UK groundwork company. Today is ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}. You help office staff and site managers with jobs, clients, quotes, invoices, subcontractors, scheduling, and compliance. Be concise, professional, and practical. Always use £ for currency. When you need data, use the available tools.`,
};

export function useAI() {
  const [messages, setMessages] = useState<Message[]>([SYSTEM_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userContent: string) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = { role: 'user', content: userContent };
    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string };
        throw new Error(err.error ?? 'Failed to get AI response');
      }

      if (!response.body) throw new Error('No response stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      }
    } catch (err) {
      setMessages(updatedMessages);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([SYSTEM_MESSAGE]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
