import { Env, OpenAIChatRequest } from './types';
import { Router } from './router';
import { ProxyError, createErrorResponse } from './utils/error-handler';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// ─────────────────────────────────────────────────────────────
// HARDCODED CONFIG (all 40 models → your backend)
// apiKeys is now a string (no square brackets)
// ─────────────────────────────────────────────────────────────
const HARDCODED_ROUTES_CONFIG = {
  'super-router': [
    {
      provider: 'openai',
      model: 'gemini-3.1-pro',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-5.4',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'claude-sonnet-4-6',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'claude-opus-4-6',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'claude-opus-4-6-experimental-thinking',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'opus-experimental',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'sonnet-experimental',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'haiku-experimental',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gemma-4-26b',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gemma-4-31b-it',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'o3-mini',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'o3-mini-high',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'o4-mini',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'o4-mini-high',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4.1',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4.1-nano',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4.1-codex',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-5.2',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-5.2-mini',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-5.2-codex',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-6',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-6-mini',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4-turbo',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4o',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-oss-120b',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'gpt-oss-20b',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'minimax-m2.7',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'GLM-5.1-FP8',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'deepseek-v3.2',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'deepseek-v3.2-thinking',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'qwen3.6-plus',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'qwen3.6-plus-search',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'qwen3.5-plus-search',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'glm5-think',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'qwen-image',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'qwen-image-edit',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'qwen-video',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
    {
      provider: 'openai',
      model: 'qwen-video-alt',
      apiKeys: 'sk-aa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F',
      baseUrl: 'http://20.199.80.17:24668/v1',
    },
  ],
};
// ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Inject hardcoded config so Router can read it
      (env as any).ROUTES_CONFIG = JSON.stringify(HARDCODED_ROUTES_CONFIG);

      // Health check
      if ((path === '/health' || path === '/') && request.method === 'GET') {
        return json({
          Status: 'Online',
          Service: 'Knowledge is free, so does AI',
          Timestamp: new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date()),
        });
      }

      // Models list
      if ((path === '/models' || path === '/v1/models') && request.method === 'GET') {
        const router = new Router(env);
        return json({
          object: 'list',
          data: router.getAvailableModels(),
        });
      }

      // Auth required
      if (!verifyAuth(request, env)) {
        throw new ProxyError('Unauthorized', 401, 'invalid_auth');
      }

      // Chat completions
      if (
        request.method === 'POST' &&
        (path === '/' || path === '/v1/chat/completions' || path === '/chat/completions')
      ) {
        return handleChatCompletion(request, env);
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

async function handleChatCompletion(request: Request, env: Env): Promise<Response> {
  const body = await request.json();
  const chatRequest = body as OpenAIChatRequest;

  if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
    throw new ProxyError('Invalid request: messages array is required', 400);
  }
  if (!chatRequest.model) {
    throw new ProxyError('Invalid request: model is required', 400);
  }

  console.log(`[Worker] model=${chatRequest.model} stream=${chatRequest.stream || false}`);

  const router = new Router(env);
  const response = await router.executeWithFallback(chatRequest);

  if (!response.success) {
    throw new ProxyError(response.error || 'All providers failed', response.statusCode || 500);
  }

  if (response.stream) {
    return new Response(response.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...CORS_HEADERS,
      },
    });
  }

  return json(response.response);
}

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
