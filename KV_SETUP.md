# Cloudflare KV Setup Guide

## Why KV?

- **Unlimited size**: Store unlimited routes config (vs 5.5KB variable limit)
- **Dynamic updates**: Change config without redeploying
- **Performance**: Lightning-fast KV lookups on Cloudflare edge

## Setup Steps

### 1. Create a KV Namespace

```bash
wrangler kv:namespace create "kawai-kv"
wrangler kv:namespace create "kawai-kv" --preview
```

You'll get output like:
```
[[kv_namespaces]]
binding = "kawai-kv"
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

### 3. Upload Your Config

```bash
# Make the script executable
chmod +x scripts/setup-kv.sh

# Upload config.json to KV
./scripts/setup-kv.sh "your-kv-namespace-id" config.json
```

Or manually:
```bash
wrangler kv:key put --namespace-id="your-kv-namespace-id" --path=config.json "routes-config"
```

### 4. Deploy

```bash
npm run deploy
```

## Updating Configuration

Simply edit `config.json` and re-run:

```bash
./scripts/setup-kv.sh "your-kv-namespace-id" config.json
```

No redeployment needed! Changes take effect immediately.

## Verify Setup

Check what's in KV:
```bash
wrangler kv:key list --namespace-id="your-kv-namespace-id"
```

View the config:
```bash
wrangler kv:key get "routes-config" --namespace-id="your-kv-namespace-id" --path=json
```

## Fallback Behavior

If KV config is not found, the worker falls back to `ROUTES_CONFIG` env variable (useful for small configs during development).

Priority:
1. **KV storage** (primary) → unlimited size
2. **Env variable** (fallback) → for development/small configs