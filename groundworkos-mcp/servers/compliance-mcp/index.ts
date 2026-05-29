import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-compliance',
  version: '1.0.0',
});

server.tool(
  'add_document',
  'Add a new document to the system',
  {
    name: z.string(),
    type: z.enum(['insurance', 'rams', 'permit', 'cscs', 'other']),
    related_to: z.enum(['job', 'subcontractor', 'company']).optional(),
    related_id: z.string().optional(),
    file_path: z.string().optional(),
    expiry_date: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const { data: client } = await supabase
      .from('clients')
      .select('company_id')
      .limit(1)
      .single();

    let status: 'active' | 'expired' | 'expiring_soon' = 'active';

    if (args.expiry_date) {
      const expiry = new Date(args.expiry_date);
      const today = new Date();
      const thirtyDays = new Date(today);
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      if (expiry < today) {
        status = 'expired';
      } else if (expiry < thirtyDays) {
        status = 'expiring_soon';
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        name: args.name,
        type: args.type,
        related_to: args.related_to ?? null,
        related_id: args.related_id ?? null,
        file_path: args.file_path ?? null,
        expiry_date: args.expiry_date ?? null,
        status,
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
  'check_compliance_status',
  'Full compliance health check - find expired and expiring documents',
  {},
  async () => {
    const today = new Date();
    const thirtyDays = new Date(today);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

    const { data: expired, error: expiredError } = await supabase
      .from('documents')
      .select('*')
      .lt('expiry_date', todayStr)
      .neq('status', 'expired');

    const { data: expiringSoon, error: expiringError } = await supabase
      .from('documents')
      .select('*')
      .gte('expiry_date', todayStr)
      .lte('expiry_date', thirtyDaysStr)
      .neq('status', 'expiring_soon');

    const { data: valid, error: validError } = await supabase
      .from('documents')
      .select('*')
      .gt('expiry_date', thirtyDaysStr);

    if (expiredError || expiringError || validError) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to fetch compliance data',
          }),
        }],
        isError: true,
      };
    }

    const expiredDocs = expired || [];
    const expiringSoonDocs = expiringSoon || [];
    const validDocs = valid || [];

    expiredDocs.forEach((doc: Record<string, unknown>) => {
      doc.status = 'expired';
    });

    expiringSoonDocs.forEach((doc: Record<string, unknown>) => {
      doc.status = 'expiring_soon';
    });

    if (expiredDocs.length > 0) {
      const ids = expiredDocs.map((d: Record<string, unknown>) => d.id);
      await supabase
        .from('documents')
        .update({ status: 'expired' })
        .in('id', ids);
    }

    if (expiringSoonDocs.length > 0) {
      const ids = expiringSoonDocs.map((d: Record<string, unknown>) => d.id);
      await supabase
        .from('documents')
        .update({ status: 'expiring_soon' })
        .in('id', ids);
    }

    let overallStatus: 'green' | 'amber' | 'red' = 'green';
    if (expiredDocs.length > 0) {
      overallStatus = 'red';
    } else if (expiringSoonDocs.length > 0) {
      overallStatus = 'amber';
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          expired: expiredDocs,
          expiring_soon: expiringSoonDocs,
          valid: validDocs,
          overall_status: overallStatus,
          summary: {
            total: expiredDocs.length + expiringSoonDocs.length + validDocs.length,
            expired_count: expiredDocs.length,
            expiring_soon_count: expiringSoonDocs.length,
            valid_count: validDocs.length,
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'flag_expiring_documents',
  'Get documents expiring within specified days',
  {
    days_ahead: z.number().optional().default(30),
  },
  async (args) => {
    const daysAhead = args.days_ahead ?? 30;
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .gte('expiry_date', todayStr)
      .lte('expiry_date', futureStr)
      .order('expiry_date', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const withDaysUntil = (data || []).map((doc: Record<string, unknown>) => {
      const expiryDate = new Date(doc.expiry_date as string);
      const diffTime = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...doc,
        days_until_expiry: daysUntilExpiry,
      };
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(withDaysUntil, null, 2) }],
    };
  }
);

server.tool(
  'get_job_documents',
  'Get all documents for a specific job',
  {
    job_id: z.string(),
  },
  async (args) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('related_to', 'job')
      .eq('related_id', args.job_id)
      .order('expiry_date', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const expired = (data || []).filter((d: Record<string, unknown>) => d.status === 'expired');
    const expiringSoon = (data || []).filter((d: Record<string, unknown>) => d.status === 'expiring_soon');

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          documents: data || [],
          summary: {
            total: (data || []).length,
            expired: expired.length,
            expiring_soon: expiringSoon.length,
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_subcontractor_documents',
  'Get all documents for a specific subcontractor including CIS and insurance',
  {
    subcontractor_id: z.string(),
  },
  async (args) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('related_to', 'subcontractor')
      .eq('related_id', args.subcontractor_id)
      .order('expiry_date', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const byType: Record<string, unknown[]> = {
      insurance: [],
      cscs: [],
      other: [],
    };

    (data || []).forEach((doc: Record<string, unknown>) => {
      const type = doc.type as string;
      if (type === 'insurance' || type === 'cscs') {
        (byType[type] as unknown[]).push(doc);
      } else {
        byType.other.push(doc);
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          documents: data || [],
          by_type: byType,
          summary: {
            total: (data || []).length,
            insurance_count: byType.insurance.length,
            cscs_count: byType.cscs.length,
          },
        }, null, 2),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Compliance MCP Server running on stdio');
}

main().catch(console.error);
