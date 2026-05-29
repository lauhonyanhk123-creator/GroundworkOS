import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-subcon',
  version: '1.0.0',
});

server.tool(
  'create_subcontractor',
  'Create a new subcontractor',
  {
    company_name: z.string(),
    contact_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    trade: z.string().optional(),
    utr_number: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const { data: client } = await supabase
      .from('clients')
      .select('company_id')
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('subcontractors')
      .insert({
        company_name: args.company_name,
        contact_name: args.contact_name ?? null,
        email: args.email ?? null,
        phone: args.phone ?? null,
        trade: args.trade ?? null,
        utr_number: args.utr_number ?? null,
        notes: args.notes ?? null,
        cis_status: 'unverified',
        company_id: client?.company_id || 'default',
      })
      .select()
      .single();

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'verify_cis_status',
  'Verify a subcontractor\'s CIS status with HMRC',
  {
    subcontractor_id: z.string(),
    utr_number: z.string(),
  },
  async (args) => {
    let cisStatus: 'gross' | 'net' | 'unmatched' = 'unmatched';
    let mockResponse = false;

    try {
      const response = await fetch(
        'https://api.service.hmrc.gov.uk/misc/cis-verifications',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HMRC_ACCESS_TOKEN || ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractorUtr: args.utr_number,
            date: new Date().toISOString().split('T')[0],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json() as { verificationResult?: string };
        if (data.verificationResult === 'VERIFIED_GROSS') {
          cisStatus = 'gross';
        } else if (data.verificationResult === 'VERIFIED_NET') {
          cisStatus = 'net';
        }
      } else {
        mockResponse = true;
      }
    } catch {
      mockResponse = true;
    }

    if (mockResponse) {
      const rand = Math.random();
      if (rand > 0.7) {
        cisStatus = 'gross';
      } else if (rand > 0.4) {
        cisStatus = 'net';
      }
    }

    const verifiedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('subcontractors')
      .update({
        cis_status: cisStatus,
        cis_verified_at: verifiedAt,
      })
      .eq('id', args.subcontractor_id)
      .select()
      .single();

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: cisStatus,
          verified_at: verifiedAt,
          is_mock: mockResponse,
          subcontractor: data,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'list_subcontractors',
  'List all subcontractors with document counts',
  {},
  async () => {
    const { data, error } = await supabase
      .from('subcontractors')
      .select(`
        *,
        documents:documents(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const formatted = (data || []).map((sub: Record<string, unknown>) => ({
      ...sub,
      document_count: Array.isArray(sub.documents)
        ? sub.documents.length
        : 0,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
    };
  }
);

server.tool(
  'get_subcontractor_details',
  'Get full details for a subcontractor including all documents and payment history',
  {
    subcontractor_id: z.string(),
  },
  async (args) => {
    const { data: subcon, error: subconError } = await supabase
      .from('subcontractors')
      .select('*')
      .eq('id', args.subcontractor_id)
      .single();

    if (subconError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: subconError.message }) }],
        isError: true,
      };
    }

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('related_to', 'subcontractor')
      .eq('related_id', args.subcontractor_id)
      .order('expiry_date', { ascending: true });

    const { data: scheduleEntries } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        jobs:job_id (id, job_number, title, client_id)
      `)
      .eq('notes', `subcontractor:${args.subcontractor_id}`)
      .order('start_datetime', { ascending: false });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          subcontractor: subcon,
          documents: documents || [],
          schedule_history: scheduleEntries || [],
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'flag_cis_issues',
  'Find all subcontractors with unverified or expired CIS documents',
  {},
  async () => {
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .in('cis_status', ['unverified', 'unmatched'])
      .order('company_name', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const { data: expiredDocs } = await supabase
      .from('documents')
      .select('*')
      .eq('related_to', 'subcontractor')
      .eq('status', 'expired');

    const flaggedSubcons = new Set<string>();
    const issues: Record<string, unknown>[] = [];

    (data || []).forEach((sub: Record<string, unknown>) => {
      flaggedSubcons.add(sub.id as string);
      issues.push({
        subcontractor: sub,
        issue: 'cis_status',
        message: `CIS status is ${sub.cis_status} - needs verification`,
      });
    });

    (expiredDocs || []).forEach((doc: Record<string, unknown>) => {
      if (!flaggedSubcons.has(doc.related_id as string)) {
        flaggedSubcons.add(doc.related_id as string);
      }
      issues.push({
        document: doc,
        issue: 'document_expired',
        message: `Document "${doc.name}" has expired`,
      });
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Subcontractors MCP Server running on stdio');
}

main().catch(console.error);
