import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { tools } from '@/lib/mistral-tools';
import { createClient } from '@/lib/supabase/server';
import { executeTool } from '@/lib/tool-executor';
import { resolveActiveCompany } from '@/lib/active-company';
import { checkRateLimit } from '@/lib/rate-limit';

type ToolArg = Record<string, unknown>;
type ChatMessages = Parameters<Mistral['chat']['complete']>[0]['messages'];

// One round = the model requests tools, we execute them and hand back the
// results. Chained workflows ("find the client, then create a job for them")
// need more than one round; the cap stops a runaway loop from burning API
// credit if the model keeps asking for tools.
const MAX_TOOL_ROUNDS = 4;

// Generous for office staff, tight enough to stop a stuck client hammering a
// paid API.
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

// Build the Mistral client lazily so a missing key surfaces as a handled
// request error rather than crashing the whole route module at import time.
function getMistralClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY is not set');
  }
  return new Mistral({ apiKey });
}

function singleChunkResponse(content: string): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content));
      controller.close();
    },
  });
  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function messageContentToString(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c) => (c && typeof c === 'object' && 'text' in c ? (c as { text: string }).text : '')).join('');
  }
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const mistral = getMistralClient();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const limit = checkRateLimit(`ai:${user.id}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { data: null, error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    // Resolves the switcher cookie against the user's memberships, so it works
    // for users in several companies and never trusts the cookie on its own.
    const { companyId } = await resolveActiveCompany(supabase, user.id);

    const { messages } = await request.json() as { messages: unknown[] };
    if (!Array.isArray(messages)) {
      return NextResponse.json({ data: null, error: 'A messages array is required.' }, { status: 400 });
    }

    let conversation = messages as ChatMessages;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await mistral.chat.complete({
        model: 'mistral-small-latest',
        messages: conversation,
        tools: tools as unknown as Parameters<typeof mistral.chat.complete>[0]['tools'],
        toolChoice: 'auto',
      });

      const assistantMessage = completion.choices?.[0]?.message;
      if (!assistantMessage) {
        return NextResponse.json({ data: null, error: 'No response from AI' }, { status: 500 });
      }

      // The model answered without (further) tool calls — deliver its content.
      if (!assistantMessage.toolCalls?.length) {
        return singleChunkResponse(messageContentToString(assistantMessage.content));
      }

      const toolResults = await Promise.all(
        assistantMessage.toolCalls.map(async (tc) => {
          let args: ToolArg;
          try {
            args =
              typeof tc.function.arguments === 'string'
                ? (JSON.parse(tc.function.arguments) as ToolArg)
                : (tc.function.arguments as ToolArg);
          } catch {
            return {
              role: 'tool' as const,
              toolCallId: tc.id ?? '',
              name: tc.function.name,
              content: JSON.stringify({ error: 'Invalid tool arguments received.' }),
            };
          }
          const result = await executeTool(tc.function.name, args, supabase, companyId);
          return {
            role: 'tool' as const,
            toolCallId: tc.id ?? '',
            name: tc.function.name,
            content: JSON.stringify(result),
          };
        })
      );

      conversation = [...conversation, assistantMessage, ...toolResults] as ChatMessages;
    }

    // Tool budget exhausted — stream a final answer with no tools on offer so
    // the model has to summarise what it has.
    const finalStream = await mistral.chat.stream({
      model: 'mistral-small-latest',
      messages: conversation as Parameters<typeof mistral.chat.stream>[0]['messages'],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of finalStream) {
            const content = chunk.data.choices?.[0]?.delta?.content;
            if (typeof content === 'string' && content) controller.enqueue(encoder.encode(content));
          }
        } catch (err) {
          console.error('[AI route] Stream error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) {
    console.error('[AI route] Error:', error);
    return NextResponse.json({ data: null, error: 'Failed to process AI request' }, { status: 500 });
  }
}
