import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-template',
  version: '1.0.0',
});

server.tool(
  'hello_world',
  'A simple hello world tool',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: 'Hello from GroundworkOS MCP Template!',
        },
      ],
    };
  }
);

server.tool(
  'get_template_info',
  'Get information about the template server',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              name: 'groundworkos-template',
              version: '1.0.0',
              description: 'Template MCP server for GroundworkOS CRM',
              availableTools: ['hello_world', 'get_template_info'],
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Template MCP Server running on stdio');
}

main().catch(console.error);
