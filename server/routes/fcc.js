/**
 * FCC (Free Claude Code) model discovery endpoint.
 * When ANTHROPIC_BASE_URL points to a local FCC instance, this fetches the
 * list of viable models (providers with configured API keys) from FCC.
 */
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const FCC_MODELS_CACHE_TTL = 60_000; // 1 minute

let cachedModels = null;
let cachedAt = 0;

function getFccBaseUrl() {
  const url = (process.env.ANTHROPIC_BASE_URL || '').trim();
  if (!url) return null;
  // Only fetch from local FCC instances (not the real Anthropic API)
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) return null;
  // Strip trailing slash
  return url.replace(/\/+$/, '');
}

async function fetchFccModels(fccBaseUrl) {
  const token = process.env.ANTHROPIC_AUTH_TOKEN || 'freecc';
  const headers = { 'x-api-key': token };

  // Use /admin/api/status which includes cached_models and provider_status
  const res = await fetch(`${fccBaseUrl}/admin/api/status`, { headers, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`FCC status returned ${res.status}`);

  const data = await res.json();

  // Filter to providers that are actually configured (have API keys)
  const configuredProviders = new Set(
    (data.provider_status || [])
      .filter(p => p.status === 'configured')
      .map(p => p.provider_id)
  );

  // Build model list from cached_models filtered by configured providers
  const models = [];
  const cached = data.cached_models || {};
  for (const [providerId, modelNames] of Object.entries(cached)) {
    if (!configuredProviders.has(providerId)) continue;
    for (const name of modelNames) {
      models.push({
        value: `${providerId}/${name}`,
        label: `${providerId}/${name}`,
      });
    }
  }

  // Also fetch /v1/models as a fallback for any models not in cached_models
  try {
    const v1Res = await fetch(`${fccBaseUrl}/v1/models`, { headers, signal: AbortSignal.timeout(5000) });
    if (v1Res.ok) {
      const v1Data = await v1Res.json();
      const existingValues = new Set(models.map(m => m.value));
      for (const m of (v1Data.data || [])) {
        if (!m.id || existingValues.has(m.id)) continue;
        // Only include non-Anthropic models (these are FCC upstream models)
        // Anthropic models like claude-opus-4-20250514 won't work without a real key
        if (m.id.startsWith('claude-')) continue;
        // Extract provider/model from FCC-prefixed IDs like anthropic/deepseek/...
        const parts = m.id.split('/');
        const providerId = parts[1];
        if (providerId && configuredProviders.has(providerId)) {
          const shortId = parts.slice(1).join('/');
          if (!existingValues.has(shortId)) {
            models.push({ value: shortId, label: m.display_name || shortId });
          }
        }
      }
    }
  } catch {
    // /v1/models is optional; cached_models from /admin/api/status is sufficient
  }

  return models;
}

router.get('/models', authenticateToken, async (_req, res) => {
  try {
    const fccBaseUrl = getFccBaseUrl();
    if (!fccBaseUrl) {
      return res.json({ models: [], source: 'none' });
    }

    // Use cache
    if (cachedModels && Date.now() - cachedAt < FCC_MODELS_CACHE_TTL) {
      return res.json({ models: cachedModels, source: 'fcc', cached: true });
    }

    const models = await fetchFccModels(fccBaseUrl);
    cachedModels = models;
    cachedAt = Date.now();
    return res.json({ models, source: 'fcc' });
  } catch (err) {
    console.error('[FCC] Failed to fetch models:', err.message);
    return res.json({ models: [], source: 'error', error: err.message });
  }
});

/**
 * POST /api/fcc/test-model
 * Body: { model: string }
 *
 * Tests any model (standard Anthropic alias or FCC-discovered) by sending a
 * minimal request through FCC. Returns:
 *   { ok: true, model }                        — model is ready
 *   { ok: false, model, reason: 'not_configured', error } — provider missing API key
 *   { ok: false, model, reason: 'not_ready', error }      — other failure
 */
router.post('/test-model', authenticateToken, async (req, res) => {
  try {
    const fccBaseUrl = getFccBaseUrl();
    if (!fccBaseUrl) {
      return res.json({ ok: false, model: req.body?.model, reason: 'not_ready', error: 'FCC server not configured' });
    }

    const { model } = req.body || {};
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ ok: false, reason: 'not_ready', error: 'Model is required' });
    }

    // Detect missing provider key before making the test call.
    // FCC returns provider_status in /admin/api/status — if the provider that
    // would handle this model has no key, we can report "not configured".
    const token = process.env.ANTHROPIC_AUTH_TOKEN || 'freecc';
    const headers = { 'x-api-key': token };
    try {
      const statusRes = await fetch(`${fccBaseUrl}/admin/api/status`, { headers, signal: AbortSignal.timeout(3000) });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        // FCC-discovered models have provider prefix like deepseek/…
        const providerId = model.split('/')[0];
        const providerInfo = (statusData.provider_status || []).find(p => p.provider_id === providerId);
        if (providerInfo && providerInfo.status === 'missing_key') {
          const label = providerInfo.label || 'Not configured';
          return res.json({ ok: false, model, reason: 'not_configured', provider: providerId, error: `${label} — add an API key in FCC Admin` });
        }
      }
    } catch {
      // Can't reach admin API — fall through to direct test
    }

    // Make a minimal 1-token request to FCC to validate the model
    const testRes = await fetch(`${fccBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': token,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (testRes.ok) {
      return res.json({ ok: true, model });
    }

    // Extract error detail from FCC response
    let errorDetail = `FCC returned ${testRes.status}`;
    let reason = 'not_ready';
    try {
      const errBody = await testRes.json();
      if (errBody.error?.message) {
        errorDetail = errBody.error.message;
        // Detect missing-key patterns in error messages
        if (/api.?key|unauthorized|invalid.*key|missing.*key/i.test(errorDetail)) {
          reason = 'not_configured';
        }
      }
    } catch {
      // Can't parse error body
    }

    return res.json({ ok: false, model, reason, error: errorDetail });
  } catch (err) {
    const message = err.message || String(err);
    const isNotConfigured = /api.?key|unauthorized|missing.*key/i.test(message);
    return res.json({
      ok: false,
      model: req.body?.model,
      reason: isNotConfigured ? 'not_configured' : 'not_ready',
      error: message,
    });
  }
});

export default router;
