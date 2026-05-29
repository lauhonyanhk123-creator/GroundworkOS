'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { useAI } from '@/hooks/useAI';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useAI();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const visibleMessages = messages.filter(m => m.role !== 'system');

  return (
    <Panel
      title="AI Assistant"
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      }
    >
      <div className="flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto space-y-4 p-4 -m-4 mb-0">
          {visibleMessages.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-2">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Ask me anything about your groundwork business</p>
              <p className="text-xs mt-2">Try: "Show me today's briefing" or "Create a new client"</p>
            </div>
          )}

          {visibleMessages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'flex gap-2 max-w-[80%]',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded flex items-center justify-center',
                    message.role === 'user'
                      ? 'bg-yellow text-black'
                      : 'bg-surface-3 border border-border'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'p-3 rounded',
                    message.role === 'user'
                      ? 'bg-yellow text-black'
                      : 'bg-surface-2 border border-border'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content || ''}</p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex gap-2 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-surface-3 border border-border flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded bg-surface-2 border border-border">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-danger/10 border border-danger text-danger text-sm">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border mt-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text placeholder-muted-2 focus:outline-none focus:border-yellow"
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading} loading={isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Panel>
  );
}
