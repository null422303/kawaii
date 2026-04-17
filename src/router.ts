import { RouteConfig, ProviderConfig, Env, OpenAIChatRequest, ProviderResponse } from './types';
import { TokenManager } from './token-manager';
import { ProxyError } from './utils/error-handler';

/** KV key used to store the routes configuration */
const KV_ROUTES_KEY = 'routes-config';

export class Router {
  private routes: RouteConfig = {};
  private initialized = false;

  constructor(private env: Env) {}

  /**
   * Load routes from Cloudflare KV, falling back to ROUTES_CONFIG env var.
   * Must be called before any other method.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Try KV first
      const kvConfig = await this.env.KAWAI_KV?.get(KV_ROUTES_KEY, 'text');
      if (kvConfig) {
        this.routes = JSON.parse(kvConfig);
        console.log('[Router] Loaded routes from KV:', Object.keys(this.routes));
        this.initialized = true;
        return;
      }
    } catch (error) {
      console.warn('[Router] Failed to read from KV, falling back to env:', error);
    }

    // 2. Fallback to ROUTES_CONFIG env var
    try {
      const envConfig = this.env.ROUTES_CONFIG;
      if (envConfig) {
        this.routes = JSON.parse(envConfig);
        console.log('[Router] Loaded routes from env ROUTES_CONFIG:', Object.keys(this.routes));
        this.initialized = true;
        return;
      }
    } catch (error) {
      console.error('[Router] Failed to parse ROUTES_CONFIG env var:', error);
    }

    // 3. No config found
    console.warn('[Router] No routes configuration found in KV or env. No models available.');
    this.initialized = true;
  }

  /**
   * Re-read routes from KV (call after a mutation to refresh the in-memory cache).
   */
  async refresh(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  // ---------------------------------------------------------------------------
  // Read operations (used by proxy)
  // ---------------------------------------------------------------------------

  /**
   * Get list of available models
   */
  getAvailableModels(): Array<{
    id: string;
    object: string;
    owned_by: string;
    permission: string[];
  }> {
    return Object.keys(this.routes).map((model) => ({
      id: model,
      object: 'model',
      owned_by: 'ai-worker-proxy',
      permission: [],
    }));
  }

  /**
   * Get the full routes config (for admin listing)
   */
  getAllRoutes(): RouteConfig {
    return this.routes;
  }

  /**
   * Get provider configurations for a given model name
   */
  getProvidersForModel(model: string): ProviderConfig[] {
    // Exact match
    if (this.routes[model]) {
      return this.routes[model];
    }

    // Default fallback — use first available route
    const defaultRoute = Object.values(this.routes)[0];
    if (defaultRoute) {
      console.log(`[Router] No config for model "${model}", using default route`);
      return defaultRoute;
    }

    throw new ProxyError(`No providers configured for model: ${model}`, 404);
  }

  /**
   * Execute request with provider fallback.
   * Tries providers in order until one succeeds.
   */
  async executeWithFallback(request: OpenAIChatRequest): Promise<ProviderResponse> {
    const model = request.model;
    if (!model) {
      throw new ProxyError('Model name is required', 400);
    }

    const providers = this.getProvidersForModel(model);
    console.log(`[Router] Model "${model}" has ${providers.length} provider(s) configured`);

    let lastError: any = null;

    for (let i = 0; i < providers.length; i++) {
      const config = providers[i];
      console.log(
        `[Router] Trying provider ${i + 1}/${providers.length}: ${config.provider}/${config.model}`
      );

      try {
        const manager = new TokenManager(config, this.env);
        const response = await manager.executeWithRotation(request);

        if (response.success) {
          console.log(`[Router] Success with provider: ${config.provider}/${config.model}`);
          return response;
        }

        lastError = response.error;
        console.log(
          `[Router] Provider ${config.provider}/${config.model} failed: ${response.error}`
        );
      } catch (error) {
        lastError = error;
        console.error(`[Router] Provider ${config.provider}/${config.model} exception:`, error);
      }
    }

    return {
      success: false,
      error: `All providers failed. Last error: ${lastError?.message || lastError || 'Unknown error'}`,
      statusCode: 500,
    };
  }

  // ---------------------------------------------------------------------------
  // Admin CRUD operations (KV-backed)
  // ---------------------------------------------------------------------------

  /**
   * Add or replace the providers for a model name.
   */
  async setRoute(model: string, providers: ProviderConfig[]): Promise<void> {
    this.routes[model] = providers;
    await this.persistToKV();
  }

  /**
   * Delete a model route.
   * Returns true if the model existed, false otherwise.
   */
  async deleteRoute(model: string): Promise<boolean> {
    if (!(model in this.routes)) return false;
    delete this.routes[model];
    await this.persistToKV();
    return true;
  }

  /**
   * Overwrite the entire routes configuration.
   */
  async setAllRoutes(config: RouteConfig): Promise<void> {
    this.routes = config;
    await this.persistToKV();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async persistToKV(): Promise<void> {
    const json = JSON.stringify(this.routes, null, 2);
    await this.env.KAWAI_KV.put(KV_ROUTES_KEY, json);
    console.log('[Router] Persisted routes to KV:', Object.keys(this.routes));
  }
}
