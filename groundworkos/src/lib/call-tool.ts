'use client'

// Browser-side helper for the /api/tools endpoint. Throws with the server's
// user-friendly message so callers can show it inline.
export async function callTool<T = unknown>(
  tool: string,
  args?: Record<string, unknown>
): Promise<T> {
  const res = await fetch('/api/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args: args ?? {} }),
  });

  let json: { data: T | null; error: string | null };
  try {
    json = (await res.json()) as { data: T | null; error: string | null };
  } catch {
    throw new Error('The request could not be completed. Please try again.');
  }

  if (!res.ok || json.error) {
    throw new Error(json.error ?? 'The request could not be completed. Please try again.');
  }

  return json.data as T;
}
