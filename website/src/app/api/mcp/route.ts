/**
 * Remote MCP server (Streamable HTTP, stateless) for crew administration.
 *
 * Every request must carry `Authorization: Bearer ${CREW_ADMIN_TOKEN}`.
 * Authentication goes through authenticateAdmin(), which returns an
 * identity: to move to OAuth later, swap its implementation and publish
 * /.well-known/oauth-protected-resource; the handler stays the same.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateAdmin, unauthorized } from "@/lib/crew/auth";
import { buildCrewMcpServer } from "@/lib/crew/mcp/server";

export const runtime = "nodejs";
export const preferredRegion = "syd1";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function handle(request: Request): Promise<Response> {
  const identity = await authenticateAdmin(request);
  if (!identity) return unauthorized();

  // Stateless: a fresh server and transport per request suits serverless.
  const server = buildCrewMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request, {
      authInfo: { token: "redacted", clientId: identity.subject, scopes: ["crew:admin"] },
    });
  } finally {
    // The JSON response is fully built by now; release the per-request server.
    void server.close();
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
