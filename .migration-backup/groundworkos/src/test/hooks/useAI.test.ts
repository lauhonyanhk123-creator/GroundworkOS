import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAI } from '@/hooks/useAI';

function makeStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

describe('useAI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises with system message and no loading', () => {
    const { result } = renderHook(() => useAI());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('system');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('clearMessages resets to only the system message', async () => {
    const { result } = renderHook(() => useAI());
    await act(async () => {
      result.current.clearMessages();
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('system');
    expect(result.current.error).toBeNull();
  });

  it('sendMessage POSTs to /api/ai with messages array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: makeStream('Hello from AI'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAI());
    await act(async () => {
      await result.current.sendMessage('What jobs are active?');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/ai', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toBeInstanceOf(Array);
    expect(body.messages.some((m: { role: string; content: string }) => m.content === 'What jobs are active?')).toBe(true);
  });

  it('appends user message and assistant response to messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: makeStream('There are 3 active jobs.'),
    }));

    const { result } = renderHook(() => useAI());
    await act(async () => {
      await result.current.sendMessage('How many active jobs?');
    });

    const msgs = result.current.messages;
    const userMsg = msgs.find(m => m.role === 'user');
    const assistantMsg = msgs.find(m => m.role === 'assistant');

    expect(userMsg?.content).toBe('How many active jobs?');
    expect(assistantMsg?.content).toBe('There are 3 active jobs.');
  });

  it('sets error state on failed fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Unauthorised' }),
    }));

    const { result } = renderHook(() => useAI());
    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.error).toBe('Unauthorised');
  });

  it('sets error state on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const { result } = renderHook(() => useAI());
    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.error).toBeTruthy();
  });

  it('isLoading returns false after completion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: makeStream('Done'),
    }));

    const { result } = renderHook(() => useAI());
    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.isLoading).toBe(false);
  });
});
