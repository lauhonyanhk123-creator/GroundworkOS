# GroundworkOS MCP Server Setup Guide

This guide explains how to set up and run the Model Context Protocol (MCP) servers that power GroundworkOS's AI assistant capabilities.

## Architecture Overview

GroundworkOS uses MCP servers to handle business logic:

```
User Request → Next.js App → Mistral AI → MCP Tools → Supabase Database
                    ↓
              GroundworkOS MCP Servers
                    ↓
              Supabase Database
```

### MCP Servers

1. **Clients MCP** - Client management (create, read, update, search)
2. **Jobs MCP** - Job lifecycle management
3. **Quotes MCP** - Quote creation and management
4. **Invoices MCP** - Invoice generation and tracking
5. **Subcontractors MCP** - Subcontractor management and CIS compliance
6. **Scheduling MCP** - Calendar and scheduling
7. **Compliance MCP** - Document and certification tracking
8. **Reporting MCP** - Business analytics and insights

## Local Development Setup

### Option 1: Direct Import (Recommended for Development)

The Next.js app imports MCP server functions directly, which is simpler for local development.

1. **Start Supabase locally:**
```bash
cd groundworkos
supabase start
```

2. **Run database migrations:**
```bash
supabase db reset
```

3. **Start the Next.js app:**
```bash
cd groundworkos
npm run dev
```

The app will be available at http://localhost:3000

### Option 2: Standalone MCP Servers (Production-like)

For testing the full MCP architecture:

1. **Start each MCP server:**
```bash
# Terminal 1 - Clients MCP
cd groundworkos-mcp
npm install
npm run build
npm start -- --port 3001

# Terminal 2 - Jobs MCP
npm start -- --port 3002

# Terminal 3 - Additional servers...
```

2. **Configure environment:**
Create `groundworkos/.env.local`:
```env
MCP_CLIENTS_URL=http://localhost:3001
MCP_JOBS_URL=http://localhost:3002
# etc.
```

3. **Update AI route:**
Modify `src/app/api/ai/route.ts` to call MCP servers via HTTP instead of direct imports.

## MCP Server Reference

### Available Tools

#### Clients MCP (Port 3001)
```typescript
create_client(company_name, contact_name?, email?, phone?, address?, companies_house_number?, notes?)
get_client(client_id)
search_clients(query)
get_client_history(client_id)
update_client(client_id, updates)
```

#### Jobs MCP (Port 3002)
```typescript
create_job(client_id, title, type, site_address?, value?, start_date?, description?)
get_job(job_id)
search_jobs(query?, status?, client_id?)
update_job(job_id, updates)
log_site_visit(job_id, progress_percent, notes?)
update_job_status(job_id, status, notes?)
```

#### Quotes MCP (Port 3003)
```typescript
create_quote(client_id, title, line_items, notes?)
get_quote(quote_id)
search_quotes(query?, status?)
update_quote(quote_id, updates)
send_quote(quote_id)
accept_quote(quote_id)
convert_to_job(quote_id)
```

#### Invoices MCP (Port 3004)
```typescript
create_invoice(quote_id)
get_invoice(invoice_id)
search_invoices(query?, status?, client_id?)
mark_invoice_paid(invoice_id)
mark_invoice_sent(invoice_id)
get_outstanding_invoices()
```

#### Subcontractors MCP (Port 3005)
```typescript
create_subcontractor(company_name, contact_name?, trade?, cis_status?, utr_number?)
get_subcontractor(subcontractor_id)
search_subcontractors(query?)
update_subcontractor(subcontractor_id, updates)
verify_cis_status(subcontractor_id)
add_document(subcontractor_id, name, type, expiry_date?, file?)
```

#### Scheduling MCP (Port 3006)
```typescript
create_schedule_entry(job_id, title, start_datetime, end_datetime?, crew_count?, plant_assigned?, notes?)
get_schedule_entry(entry_id)
search_schedule_entries(date_from?, date_to?, job_id?)
update_schedule_entry(entry_id, updates)
delete_schedule_entry(entry_id)
get_weekly_schedule(week_start_date)
```

#### Compliance MCP (Port 3007)
```typescript
add_document(name, type, related_to, related_id?, expiry_date?, file?)
get_document(document_id)
search_documents(query?, type?, status?)
update_document(document_id, updates)
delete_document(document_id)
get_expiring_documents(days_ahead?)
get_compliance_status()
```

#### Reporting MCP (Port 3008)
```typescript
get_revenue_report(date_from?, date_to?)
get_pipeline_report()
get_job_statistics()
get_client_statistics()
get_subcontractor_cis_summary()
generate_business_insights()
```

## API Authentication

All MCP server endpoints require authentication:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
}
```

## Error Handling

MCP servers return standardized error responses:

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field error"
    }
  }
}
```

### Error Codes

- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `INTERNAL_ERROR` - Server-side error

## Testing MCP Servers

### Using curl

```bash
# Test Clients MCP
curl -X POST http://localhost:3001/tools/create_client \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "company_name": "Test Company",
    "contact_name": "John Doe",
    "email": "john@example.com"
  }'
```

### Using Postman/Insomnia

Import the OpenAPI spec from `groundworkos-mcp/openapi.json` for full API documentation.

## Performance Considerations

1. **Connection Pooling:** MCP servers should use connection pooling for database connections
2. **Caching:** Implement Redis caching for frequently accessed data
3. **Rate Limiting:** Add rate limiting to prevent abuse
4. **Batch Operations:** Support batch tool calls from Mistral AI

## Monitoring

### Health Checks

Each MCP server exposes a health endpoint:
```bash
GET http://localhost:3001/health
```

Returns:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected"
}
```

### Logging

All MCP servers log to stdout in JSON format:
```json
{
  "level": "info",
  "message": "Tool execution completed",
  "tool": "create_client",
  "duration_ms": 145,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Deployment

### Docker

Create `Dockerfile` for each MCP server:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Kubernetes

Create `k8s/` directory with:
- `deployment.yaml` - Pod configuration
- `service.yaml` - Service configuration
- `ingress.yaml` - Ingress rules
- `configmap.yaml` - Environment variables

## Troubleshooting

### Common Issues

**Connection refused:**
- Check the MCP server is running on the correct port
- Verify firewall rules allow connections

**Authentication errors:**
- Ensure Supabase keys are correctly set
- Check token hasn't expired

**Database errors:**
- Verify database migrations have run
- Check connection string is correct
- Ensure RLS policies allow the operations

**Timeout errors:**
- Increase timeout in the AI route
- Optimize database queries
- Add indexes to frequently queried columns

## Development Workflow

1. **Make changes to MCP server:**
```bash
cd groundworkos-mcp
# Edit files
npm run build
```

2. **Test locally:**
```bash
# Terminal 1: Run MCP server
npm start

# Terminal 2: Run Next.js
cd ../groundworkos
npm run dev
```

3. **Deploy:**
```bash
# Build MCP servers
npm run build

# Deploy to cloud (Docker/Kubernetes)
kubectl apply -f k8s/
```

## Support

For MCP server issues:
- Check server logs for errors
- Verify all dependencies are installed
- Ensure database schema is up to date
- Review error codes above

---

Last updated: 2026-05-29
