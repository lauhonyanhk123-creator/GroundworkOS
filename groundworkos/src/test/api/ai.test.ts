import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockComplete, mockStream } = vi.hoisted(() => ({
  mockComplete: vi.fn(),
  mockStream: vi.fn(),
}));

vi.mock('@mistralai/mistralai', () => ({
  Mistral: function MistralMock() {
    return { chat: { complete: mockComplete, stream: mockStream } };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { POST } from '@/app/api/ai/route';
import { createClient } from '@/lib/supabase/server';
import { resetRateLimits } from '@/lib/rate-limit';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeAuthSupabase(user: { id: string } | null = { id: 'u-1' }) {
  // resolveActiveCompany awaits .select().eq() directly, so the builder must
  // be thenable as well as chainable.
  const from = vi.fn().mockImplementation((table: string) => {
    const memberships = table === 'user_companies' ? [{ company_id: 'c-1', role: 'admin' }] : null;
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: (v: unknown) => unknown) => resolve({ data: memberships, error: null }),
    };
  });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('Hello from AI'));
      controller.close();
    },
  });

  mockComplete.mockResolvedValue({
    choices: [{ message: { content: 'Hello from AI', toolCalls: undefined } }],
  });
  mockStream.mockResolvedValue({
    toReadableStream: vi.fn().mockReturnValue(stream),
  });
});

describe('POST /api/ai', () => {
  it('returns 401 when unauthenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthSupabase(null)
    );
    const res = await POST(makeRequest({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it('returns a streaming response for a valid message', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthSupabase({ id: 'u-1' })
    );

    const res = await POST(makeRequest({
      messages: [
        { role: 'system', content: 'You are an assistant' },
        { role: 'user', content: 'How many active jobs?' },
      ],
    }));

    expect(res.status).toBe(200);
  });

  it('calls Mistral with the provided messages', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthSupabase({ id: 'u-1' })
    );

    await POST(makeRequest({
      messages: [{ role: 'user', content: 'List clients' }],
    }));

    expect(mockComplete).toHaveBeenCalled();
    const callArgs = mockComplete.mock.calls[0][0];
    expect(callArgs.model).toBe('mistral-small-latest');
  });

  it('returns content directly when there are no tool calls', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthSupabase({ id: 'u-1' })
    );

    const res = await POST(makeRequest({
      messages: [{ role: 'user', content: 'Hello' }],
    }));

    // No tool calls → complete is called, stream is NOT called
    expect(mockComplete).toHaveBeenCalled();
    expect(mockStream).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
