# Cloudflare KV Setup Guide

## Why KV?

- **Unlimited size**: Store unlimited routes config (vs 5.5KB variable limit on `ROUTES_CONFIG`)
- **Dynamic updates**: Add, modify, or delete models via the Admin API — **no redeployment needed**
- **Performance**: Lightning-fast KV lookups on Cloudflare edge

---

## Setup Steps

### 1. Create a KV Namespace

```bash
wrangler kv:namespace create "kawai-kv"
wrangler kv:namespace create "kawai-kv" --preview
```

You'll get output like:
```
[[kv_namespaces]]
binding = "KAWAI_KV"
id = "abc123def456"
preview_id = "xyz789uvw012"
```

### 2. Update `wrangler.toml`

Replace the placeholder IDs:

```toml
[[kv_namespaces]]
binding = "KAWAI_KV"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-namespace-id"
```

### 3. Seed Your Initial Config

**Option A — Via Wrangler CLI:**

```bash
# Create a config.json with your routes
cat > config.json << 'EOF'
{
  "deep-think": [
    {
      "provider": "anthropic",
      "model": "claude-opus-4-20250514",
      "apiKeys": ["ANTHROPIC_KEY_1"]
    }
  ],
  "fast": [
    {
      "provider": "google",
      "model": "gemini-2.0-flash",
      "apiKeys": ["GOOGLE_KEY_1"]
    }
  ]
}
EOF

wrangler kv:key put --namespace-id="your-kv-namespace-id" "routes-config" --path=config.json
```

**Option B — Via Admin API (after deploying):**

```bash
# Add a single route
curl -X POST https://ai-proxy.YOUR-USERNAME.workers.dev/v1/admin/routes \
  -H "Authorization: Bearer YOUR_PROXY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fast",
    "providers": [
      {
        "provider": "google",
        "model": "gemini-2.0-flash",
        "apiKeys": ["GOOGLE_KEY_1"]
      }
    ]
  }'
```

### 4. Deploy

```bash
npm run deploy
```

---

## Admin API Reference

All admin endpoints require the same `Authorization: Bearer <PROXY_AUTH_TOKEN>` header used for chat requests.

### List All Routes

```bash
GET /v1/admin/routes
```

```bash
curl https://ai-proxy.YOUR-USERNAME.workers.dev/v1/admin/routes \
  -H "Authorization: Bearer YOUR_PROXY_AUTH_TOKEN"
```

Response:
```json
{
  "deep-think": [{ "provider": "anthropic", "model": "claude-opus-4-20250514", "apiKeys": ["ANTHROPIC_KEY_1"] }],
  "fast": [{ "provider": "google", "model": "gemini-2.0-flash", "apiKeys": ["GOOGLE_KEY_1"] }]
}
```

### Add / Update a Route

```bash
POST /v1/admin/routes
```

```bash
curl -X POST https://ai-proxy.YOUR-USERNAME.workers.dev/v1/admin/routes \
  -H "Authorization: Bearer YOUR_PROXY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "search",
    "providers": [
      {
        "provider": "google",
        "model": "gemini-3-flash-preview",
        "apiKeys": ["GOOGLE_KEY_1"],
        "grounding": true
      }
    ]
  }'
```

Response:
```json
{ "message": "Route \"search\" saved", "model": "search" }
```

### Delete a Route

```bash
DELETE /v1/admin/routes?model=<model-name>
```

```bash
curl -X DELETE "https://ai-proxy.YOUR-USERNAME.workers.dev/v1/admin/routes?model=search" \
  -H "Authorization: Bearer YOUR_PROXY_AUTH_TOKEN"
```

Response:
```json
{ "message": "Route \"search\" deleted", "model": "search" }
```

### Replace Entire Config

```bash
PUT /v1/admin/routes
```

```bash
curl -X PUT https://ai-proxy.YOUR-USERNAME.workers.dev/v1/admin/routes \
  -H "Authorization: Bearer YOUR_PROXY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fast": [{ "provider": "google", "model": "gemini-2.0-flash", "apiKeys": ["GOOGLE_KEY_1"] }],
    "smart": [{ "provider": "anthropic", "model": "claude-sonnet-4-20250514", "apiKeys": ["ANTHROPIC_KEY_1"] }]
  }'
```

Response:
```json
{ "message": "All routes updated", "models": ["fast", "smart"] }
```

---

## GitHub Actions (Optional)

If you set a `ROUTES_CONFIG` GitHub Variable and a `KV_NAMESPACE_ID` secret, the deploy workflow will automatically upload the config to KV after each deployment.

**GitHub Secrets to add:**
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `KV_NAMESPACE_ID`

**GitHub Variable to add:**
- `ROUTES_CONFIG` (JSON string of your routes)

However, once you've seeded KV, you can manage routes entirely via the Admin API and never touch GitHub Variables again.

---

## Verify Setup

Check what's in KV:
```bash
wrangler kv:key list --namespace-id="your-kv-namespace-id"
```

View the config:
```bash
wrangler kv:key get "routes-config" --namespace-id="your-kv-namespace-id"
```

---

## Fallback Behavior

If KV is empty or unavailable, the worker falls back to the `ROUTES_CONFIG` env variable (useful for small configs during development before KV is set up).

Priority:
1. **KV storage** (primary) → unlimited size, dynamic updates
2. **Env variable** (fallback) → for development/small configs