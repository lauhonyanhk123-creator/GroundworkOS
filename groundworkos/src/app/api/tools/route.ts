import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeTool } from '@/lib/tool-executor';
import { resolveActiveCompany } from '@/lib/active-company';

interface ToolRequestBody {
  tool?: string;
  args?: Record<string, unknown>;
}

// UI mutation endpoint. Pages call MCP tools through here instead of writing
// to Supabase directly, so the UI and the AI assistant share one business
// logic path (VAT, CIS, numbering, status guards) and one company-scoping
// implementation.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const body = (await request.json()) as ToolRequestBody;
    if (!body.tool || typeof body.tool !== 'string') {
      return NextResponse.json({ data: null, error: 'A tool name is required.' }, { status: 400 });
    }
    if (body.args !== undefined && (typeof body.args !== 'object' || body.args === null || Array.isArray(body.args))) {
      return NextResponse.json({ data: null, error: 'Tool args must be an object.' }, { status: 400 });
    }

    const { companyId } = await resolveActiveCompany(supabase, user.id);

    const result = await executeTool(body.tool, body.args ?? {}, supabase, companyId);

    // Tools surface failures as { error } objects rather than throwing.
    if (result && typeof result === 'object' && 'error' in result && (result as { error?: unknown }).error) {
      return NextResponse.json(
        { data: null, error: String((result as { error: unknown }).error) },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    console.error('[tools route] Error:', error);
    return NextResponse.json(
      { data: null, error: 'The request could not be completed. Please try again.' },
      { status: 500 }
    );
  }
}
