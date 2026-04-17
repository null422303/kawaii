import { Env, OpenAIChatRequest } from './types';
import { ProxyError, createErrorResponse } from './utils/error-handler';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// ================== YOUR BACKEND ==================
const BACKEND_URL = 'http://20.199.80.17:24668/v1';
const BACKEND_API_KEY = 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F';
// ===================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // ====================== HEALTH CHECK ======================
      if ((path === '/health' || path === '/') && request.method === 'GET') {
        return json({
          Status: 'Online',
          Service: 'Knowledge is free, so does AI',
          Timestamp: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
        });
      }

      // ====================== MODELS LIST (transparent) ======================
      if ((path === '/models' || path === '/v1/models') && request.method === 'GET') {
        const resp = await fetch(`${BACKEND_URL}/models`, {
          headers: { Authorization: `Bearer ${BACKEND_API_KEY}` },
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // ====================== AUTH CHECK ======================
      if (!verifyAuth(request, env)) {
        throw new ProxyError('Unauthorized', 401, 'invalid_auth');
      }

      // ====================== CHAT COMPLETIONS (transparent forward) ======================
      if (
        request.method === 'POST' &&
        (path === '/' || path === '/v1/chat/completions' || path === '/chat/completions')
      ) {
        const body = await request.json();

        const backendResponse = await fetch(`${BACKEND_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BACKEND_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        const responseBody = await backendResponse.text();

        return new Response(responseBody, {
          status: backendResponse.status,
          headers: {
            'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json',
            ...CORS_HEADERS,
          },
        });
      }

      throw new ProxyError('Not found', 404);
    } catch (error) {
      console.error('[Worker] Error:', error);
      const errorResponse = createErrorResponse(error);
      const headers = new Headers(errorResponse.headers);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        headers.set(key, value);
      }
      return new Response(errorResponse.body, { status: errorResponse.status, headers });
    }
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function verifyAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  return token === env.PROXY_AUTH_TOKEN;
}
