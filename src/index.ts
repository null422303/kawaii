import { Env, OpenAIChatRequest, AdminRouteRequest } from './types';
import { Router } from './router';
import { ProxyError, createErrorResponse } from './utils/error-handler';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Health check — no auth required
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

      // Initialize router (loads config from KV or env)
      const router = new Router(env);
      await router.initialize();

      // Models list — no auth required (matches OpenAI behavior)
      if ((path === '/models' || path === '/v1/models') && request.method === 'GET') {
        return json({
          object: 'list',
          data: router.getAvailableModels(),
        });
      }

      // Everything below requires auth
      if (!verifyAuth(request, env)) {
        throw new ProxyError('Unauthorized', 401, 'invalid_auth');
      }

      // ── Admin API: manage routes via KV ──────────────────────────────────
      if (path === '/v1/admin/routes' || path === '/admin/routes') {
        switch (request.method) {
          // GET — list all routes
          case 'GET':
            return json(router.getAllRoutes());

          // POST — add a new route (body: { "model": "my-model", "providers": [...] })
          case 'POST':
            return await handleAddRoute(request, router);

          // PUT — replace entire routes config (body: RouteConfig JSON)
          case 'PUT':
            return await handleSetAllRoutes(request, router);

          // DELETE — delete a route (?model=my-model)
          case 'DELETE':
            return await handleDeleteRoute(url, router);

          default:
            throw new ProxyError('Method not allowed', 405);
        }
      }

      // ── Chat completions ─────────────────────────────────────────────────
      if (
        request.method === 'POST' &&
        (path === '/' || path === '/v1/chat/completions' || path === '/chat/completions')
      ) {
        return handleChatCompletion(request, env, router);
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

// ─── Chat completions ────────────────────────────────────────────────────────

async function handleChatCompletion(
  request: Request,
  env: Env,
  router: Router
): Promise<Response> {
  const body = await request.json();
  const chatRequest = body as OpenAIChatRequest;

  if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
    throw new ProxyError('Invalid request: messages array is required', 400);
  }
  if (!chatRequest.model) {
    throw new ProxyError('Invalid request: model is required', 400);
  }

  console.log(`[Worker] model=${chatRequest.model} stream=${chatRequest.stream || false}`);

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

// ─── Admin route handlers ────────────────────────────────────────────────────

async function handleAddRoute(request: Request, router: Router): Promise<Response> {
  const body = (await request.json()) as { model: string; providers: AdminRouteRequest['providers'] };

  if (!body.model || typeof body.model !== 'string') {
    throw new ProxyError('Invalid request: "model" (string) is required', 400);
  }
  if (!body.providers || !Array.isArray(body.providers) || body.providers.length === 0) {
    throw new ProxyError('Invalid request: "providers" (non-empty array) is required', 400);
  }

  await router.setRoute(body.model, body.providers);
  return json({ message: `Route "${body.model}" saved`, model: body.model }, 201);
}

async function handleSetAllRoutes(request: Request, router: Router): Promise<Response> {
  const body = (await request.json()) as Record<string, any>;

  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new ProxyError('Invalid request: body must be a routes config object', 400);
  }

  await router.setAllRoutes(body);
  return json({ message: 'All routes updated', models: Object.keys(body) });
}

async function handleDeleteRoute(url: URL, router: Router): Promise<Response> {
  const model = url.searchParams.get('model');

  if (!model) {
    throw new ProxyError('Query parameter "model" is required (e.g. ?model=my-model)', 400);
  }

  const deleted = await router.deleteRoute(model);
  if (!deleted) {
    throw new ProxyError(`Route "${model}" not found`, 404);
  }

  return json({ message: `Route "${model}" deleted`, model });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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