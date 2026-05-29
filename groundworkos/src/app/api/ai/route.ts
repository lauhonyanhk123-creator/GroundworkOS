import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { tools } from '@/lib/mistral-tools';
import { createClient } from '@/lib/supabase/server';

const mistralApiKey = process.env.MISTRAL_API_KEY;

if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not set');
}

const mistral = new Mistral({ apiKey: mistralApiKey });

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    const supabase = await createClient();

    const response = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages,
      tools: tools as any,
      toolChoice: 'auto',
    });

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No message returned from AI' },
        { status: 500 }
      );
    }

    if (assistantMessage.toolCalls) {
      const toolResponses = [];
      
      for (const toolCall of assistantMessage.toolCalls) {
        const result = await executeTool(toolCall.function.name, toolCall.function.arguments, supabase);
        toolResponses.push({
          role: 'tool' as const,
          toolCallId: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result),
        });
      }

      const secondResponse = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [...messages, assistantMessage, ...toolResponses],
      });

      const secondAssistantMessage = secondResponse.choices[0]?.message;
      if (!secondAssistantMessage) {
        return NextResponse.json(
          { error: 'No message returned from AI' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: secondAssistantMessage,
      });
    }

    return NextResponse.json({
      message: assistantMessage,
    });
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

async function executeTool(toolName: string, args: any, supabase: any) {
  try {
    switch (toolName) {
      case 'create_client':
        return await createClientTool(args, supabase);
      case 'get_client':
        return await getClientTool(args, supabase);
      case 'search_clients':
        return await searchClientsTool(args, supabase);
      case 'get_client_history':
        return await getClientHistoryTool(args, supabase);
      case 'update_client':
        return await updateClientTool(args, supabase);
      case 'list_jobs':
        return await listJobsTool(args, supabase);
      case 'get_job_details':
        return await getJobDetailsTool(args, supabase);
      case 'get_job_summary_stats':
        return await getJobSummaryStatsTool(supabase);
      case 'get_pipeline_summary':
        return await getPipelineSummaryTool(supabase);
      case 'get_daily_briefing':
        return await getDailyBriefingTool(supabase);
      case 'get_outstanding_invoices':
        return await getOutstandingInvoicesTool(supabase);
      default:
        return { error: `Tool ${toolName} not implemented yet` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function createClientTool(args: any, supabase: any) {
  const { company_name, contact_name, email, phone, address, companies_house_number, notes } = args;
  const { data, error } = await supabase
    .from('clients')
    .insert({
      company_name,
      contact_name: contact_name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      companies_house_number: companies_house_number ?? null,
      notes: notes ?? null,
      company_id: 'default',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getClientTool(args: any, supabase: any) {
  const { client_id } = args;
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', client_id)
    .single();
  if (clientError) throw new Error(clientError.message);

  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client_id);

  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('client_id', client_id)
    .eq('status', 'paid');

  const totalInvoiced = invoices?.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0) || 0;

  return {
    ...client,
    job_count: jobCount || 0,
    total_invoiced: totalInvoiced,
  };
}

async function searchClientsTool(args: any, supabase: any) {
  const { query } = args;
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%`)
    .limit(10);
  if (error) throw new Error(error.message);
  return data || [];
}

async function getClientHistoryTool(args: any, supabase: any) {
  const { client_id } = args;
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', client_id)
    .single();
  if (clientError) throw new Error(clientError.message);

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false });

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false });

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false });

  return { client, jobs: jobs || [], quotes: quotes || [], invoices: invoices || [] };
}

async function updateClientTool(args: any, supabase: any) {
  const { client_id, ...updates } = args;
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }
  const { data, error } = await supabase
    .from('clients')
    .update(cleanUpdates)
    .eq('id', client_id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function listJobsTool(args: any, supabase: any) {
  const { status, client_id, limit = 20 } = args;
  let query = supabase.from('jobs').select('*');
  if (status) query = query.eq('status', status);
  if (client_id) query = query.eq('client_id', client_id);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

async function getJobDetailsTool(args: any, supabase: any) {
  const { job_id } = args;
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', job_id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getJobSummaryStatsTool(supabase: any) {
  const { count: totalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true });
  
  const { count: activeJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_progress');
  
  const { count: completedJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');
  
  return {
    total_jobs: totalJobs || 0,
    active_jobs: activeJobs || 0,
    completed_jobs: completedJobs || 0,
  };
}

async function getPipelineSummaryTool(supabase: any) {
  const { count: quoteCount } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true });
  
  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true });
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, status');
  
  const totalRevenue = invoices?.reduce((sum: number, inv: { total_amount: number; status: string }) => 
    inv.status === 'paid' ? sum + (inv.total_amount || 0) : sum, 0) || 0;
  
  return {
    total_quotes: quoteCount || 0,
    total_jobs: jobCount || 0,
    total_revenue: totalRevenue,
  };
}

async function getDailyBriefingTool(supabase: any) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todayJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'in_progress');
  
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'sent')
    .lt('due_date', today);
  
  const { data: upcomingSchedule } = await supabase
    .from('schedule')
    .select('*')
    .gte('start_datetime', today)
    .lte('start_datetime', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('start_datetime', { ascending: true });
  
  return {
    date: today,
    active_jobs: todayJobs?.length || 0,
    overdue_invoices: overdueInvoices?.length || 0,
    upcoming_schedule: upcomingSchedule?.length || 0,
    jobs: todayJobs || [],
    invoices: overdueInvoices || [],
    schedule: upcomingSchedule || [],
  };
}

async function getOutstandingInvoicesTool(supabase: any) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'sent')
    .order('due_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}
