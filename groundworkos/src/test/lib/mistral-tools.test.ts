import { describe, it, expect } from 'vitest';
import { tools } from '@/lib/mistral-tools';

describe('mistral tool definitions', () => {
  it('exposes JSON Schema (not raw Zod) for every tool', () => {
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.type).toBe('function');
      expect(typeof tool.function.name).toBe('string');
      const params = tool.function.parameters as Record<string, unknown>;
      expect(params.type).toBe('object');
      expect(params).toHaveProperty('properties');
      // Must be plain JSON Schema — a serialized Zod schema would leak these.
      expect(params).not.toHaveProperty('_def');
      expect(params).not.toHaveProperty('$schema');
    }
  });

  it('converts nested line_items into an array schema', () => {
    const createQuote = tools.find((t) => t.function.name === 'create_quote');
    const params = createQuote?.function.parameters as {
      properties: Record<string, { type?: string }>;
    };
    expect(params.properties.line_items.type).toBe('array');
  });
});
