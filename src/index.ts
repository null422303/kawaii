import { Env, OpenAIChatRequest } from './types';
import { ProxyError, createErrorResponse } from './utils/error-handler';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// All real models from your backend
const MODELS = [
  'gemini-3.1-pro',
  'gpt-5.4',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-opus-4-6-experimental-thinking',
  'opus-experimental',
  'sonnet-experimental',
  'haiku-experimental',
  'gemma-4-26b',
  'gemma-4-31b-it',
  'o3-mini',
  'o3-mini-high',
  'o4-mini',
  'o4-mini-high',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4.1-codex',
  'gpt-5.2',
  'gpt-5.2-mini',
  'gpt-5.2-codex',
  'gpt-6',
  'gpt-6-mini',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-oss-120b',
  'gpt-oss-20b',
  'minimax-m2.7',
  'GLM-5.1-FP8',
  'deepseek-v3.2',
  'deepseek-v3.2-thinking',
  'qwen3.6-plus',
  'qwen3.6-plus-search',
  'qwen3.5-plus-search',
  'glm5-think',
  'qwen-image',
  'qwen-image-edit',
  'qwen-video',
  'qwen-video-alt',
];

// Backend settings
const BACKEND_URL = 'http://20.199.80.17:24668/v1';
const BACKEND_API_KEY = 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Health check
      if ((path === '/health' || path === '/') && request.method === 'GET') {
        return json({
          Status: 'Online',
          Service: 'Knowledge is free, so does AI',
          Timestamp: new Date().toISOString(),
        });
      }

      // Return all real models
      if ((path === '/models' || path === '/v1/models') && request.method === 'GET') {
        const data = MODELS.map((model) => ({
          id: model,
          object: 'model',
          owned_by: 'custom',
          permission: [],
        }));

        return json({ object: 'list', data });
      }

      // Auth check
      if (!verifyAuth(request, env)) {
        throw new ProxyError('Unauthorized', 401, 'invalid_auth');
      }

      // Forward chat completions directly to your backend (same model name)
      if (
        request.method === 'POST' &&
        (path === '/v1/chat/completions' || path === '/chat/completions' || path === '/')
      ) {
        const body = (await request.json()) as OpenAIChatRequest;

        const forwardResponse = await fetch(`${BACKEND_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BACKEND_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        // Handle streaming response
        if (forwardResponse.headers.get('content-type')?.includes('text/event-stream')) {
          return new Response(forwardResponse.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              ...CORS_HEADERS,
            },
          });
        }

        const result = await forwardResponse.json();
        return json(result, forwardResponse.status);
      }

      throw new ProxyError('Not found', 404);
    } catch (error) {
      console.error('[Worker] Error:', error);
      const errorResponse = createErrorResponse(error);
      const headers = new Headers(errorResponse.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
      return new Response(errorResponse.body, {
        status: errorResponse.status,
        headers,
      });
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
