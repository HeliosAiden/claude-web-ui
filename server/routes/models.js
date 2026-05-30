/**
 * Model test endpoint for default/hardcoded models (non-FCC).
 * Tests standard Anthropic model aliases like opus, sonnet, haiku, etc.
 * through the appropriate backend (FCC proxy or direct Anthropic API).
 */
import { Router } from 'express';

import { authenticateToken } from '../middleware/auth.js';

const router = Router();

function getFccBaseUrl() {
  const url = (process.env.ANTHROPIC_BASE_URL || '').trim();
  if (!url) return null;
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) return null;
  return url.replace(/\/+$/, '');
}

// Anthropic alias → FCC env var that controls its routing
const ALIAS_TO_FCC_VAR = {
  opus: 'MODEL_OPUS',
  sonnet: 'MODEL_SONNET',
  haiku: 'MODEL_HAIKU',
};

// All standard Claude model values that appear in the mobile/desktop model pickers
const STANDARD_MODEL_VALUES = ['opus', 'sonnet', 'haiku', 'claude-opus-4-6', 'opusplan', 'sonnet[1m]', 'opus[1m]'];

/**
 * GET /api/models/availability
 *
 * Returns per-model availability for standard Claude models without making
 * actual 1-token API calls (unlike POST /test). Checks config only.
 *
 * - Without FCC: available = ANTHROPIC_API_KEY is set
 * - With FCC: resolves each model through FCC env vars, checks that the
 *   upstream provider has status "configured" (has an API key)
 *
 * FCC-discovered models (deepseek/, etc.) are NOT returned here — they are
 * always available by construction (the FCC discovery endpoint already filters
 * to configured providers only).
 */
router.get('/availability', authenticateToken, async (_req, res) => {
  const fccBaseUrl = getFccBaseUrl();
  const availability = {};

  if (!fccBaseUrl) {
    // No FCC — check if a direct Anthropic API key is available
    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
    for (const m of STANDARD_MODEL_VALUES) {
      if (hasKey) {
        availability[m] = { available: true };
      } else {
        availability[m] = { available: false, reason: 'not_configured', error: 'No ANTHROPIC_API_KEY configured' };
      }
    }
    return res.json({ availability });
  }

  // FCC mode: fetch provider status + config from FCC admin API
  try {
    const token = process.env.ANTHROPIC_AUTH_TOKEN || 'freecc';

    const [statusRes, configRes] = await Promise.all([
      fetch(`${fccBaseUrl}/admin/api/status`, {
        headers: { 'x-api-key': token },
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${fccBaseUrl}/admin/api/config`, {
        headers: { 'x-api-key': token },
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (!statusRes.ok || !configRes.ok) {
      console.error(`[FCC] /admin/api/status or /admin/api/config returned errors (${statusRes.status}, ${configRes.status})`);
      for (const m of STANDARD_MODEL_VALUES) {
        availability[m] = { available: false, reason: 'not_ready', error: 'Cannot reach FCC admin API' };
      }
      return res.json({ availability });
    }

    const statusData = await statusRes.json();
    const config = await configRes.json();

    // Build provider status map: { providerId: 'configured' | 'missing_key' | ... }
    const providerStatusMap = {};
    for (const p of (statusData.provider_status || [])) {
      providerStatusMap[p.provider_id] = p;
    }

    // Check each standard model
    for (const m of STANDARD_MODEL_VALUES) {
      const fccVar = ALIAS_TO_FCC_VAR[m];
      let resolvedModel = null;
      if (fccVar) {
        resolvedModel = config[fccVar] || config.MODEL || null;
      } else {
        // Non-standard alias — try the generic MODEL env var
        resolvedModel = config.MODEL || m;
      }

      if (!resolvedModel) {
        availability[m] = {
          available: false,
          reason: 'not_configured',
          error: `No model mapping configured in FCC for "${m}". Set ${fccVar || 'MODEL'} in FCC Admin.`,
        };
        continue;
      }

      const providerId = resolvedModel.split('/')[0];
      const providerInfo = providerStatusMap[providerId];

      if (providerInfo && providerInfo.status === 'configured') {
        availability[m] = { available: true };
      } else if (providerInfo && providerInfo.status === 'missing_key') {
        availability[m] = {
          available: false,
          reason: 'not_configured',
          error: `${providerInfo.label || providerId} — no API key configured in FCC Admin`,
        };
      } else {
        availability[m] = {
          available: false,
          reason: 'not_ready',
          error: `Provider "${providerId}" status: ${providerInfo?.status || 'unknown'}. Check FCC Admin.`,
        };
      }
    }
  } catch (err) {
    console.error('[FCC] Error checking model availability:', err.message);
    for (const m of STANDARD_MODEL_VALUES) {
      availability[m] = { available: false, reason: 'not_ready', error: err.message };
    }
  }

  return res.json({ availability });
});

/**
 * Diagnose why a model failed through FCC by inspecting FCC's admin config.
 * Returns { reason, error } with a user-readable explanation.
 */
async function diagnoseFccFailure(fccBaseUrl, token, model) {
  try {
    // Fetch FCC config to see how model aliases are mapped
    const configRes = await fetch(`${fccBaseUrl}/admin/api/config`, {
      headers: { 'x-api-key': token },
      signal: AbortSignal.timeout(5000),
    });
    if (!configRes.ok) {
      console.error(`[FCC] ${fccBaseUrl}/admin/api/config returned ${configRes.status} ${configRes.statusText} (diagnosing model "${model}")`);
      return null;
    }

    const config = await configRes.json();

    // Determine which provider/model this alias resolves to
    const fccVar = ALIAS_TO_FCC_VAR[model];
    let resolvedModel = null;
    if (fccVar) {
      resolvedModel = config[fccVar] || config.MODEL || null;
    } else {
      // Non-standard alias — try MODEL, or assume passthrough
      resolvedModel = config.MODEL || model;
    }

    if (!resolvedModel) {
      return {
        reason: 'not_configured',
        error: `No model mapping configured in FCC for "${model}". Set MODEL in FCC Admin.`,
      };
    }

    // Extract provider from resolved model (e.g. "deepseek/deepseek-v4-pro" → "deepseek")
    const providerId = resolvedModel.split('/')[0];

    // Check if that provider has an API key
    const statusRes = await fetch(`${fccBaseUrl}/admin/api/status`, {
      headers: { 'x-api-key': token },
      signal: AbortSignal.timeout(5000),
    });
    if (!statusRes.ok) {
      console.error(`[FCC] ${fccBaseUrl}/admin/api/status returned ${statusRes.status} ${statusRes.statusText} (diagnosing model "${model}")`);
      return null;
    }

    const status = await statusRes.json();
    const providerInfo = (status.provider_status || []).find(p => p.provider_id === providerId);

    if (providerInfo && providerInfo.status === 'missing_key') {
      return {
        reason: 'not_configured',
        error: `${providerInfo.label || providerId} — add an API key in FCC Admin`,
      };
    }

    if (!providerInfo || providerInfo.status !== 'configured') {
      return {
        reason: 'not_ready',
        error: `Provider "${providerId}" is not ready (status: ${providerInfo?.status || 'unknown'}). Check FCC Admin.`,
      };
    }

    // Provider looks configured but the call still failed — likely a model/routing issue
    return {
      reason: 'not_ready',
      error: `Model "${model}" → ${resolvedModel} failed. Check FCC logs for details.`,
    };
  } catch {
    return null;
  }
}

router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { model } = req.body || {};
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ ok: false, reason: 'not_ready', error: 'Model is required' });
    }

    const fccBaseUrl = getFccBaseUrl();

    if (fccBaseUrl) {
      // FCC proxy is configured — test through FCC
      const token = process.env.ANTHROPIC_AUTH_TOKEN || 'freecc';
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

      console.error(`[FCC] ${fccBaseUrl}/v1/messages returned ${testRes.status} ${testRes.statusText} for model "${model}"`);

      // Try to parse FCC error body for details
      let errorDetail = null;
      let reason = 'not_ready';
      try {
        const errBody = await testRes.json();
        if (errBody.error?.message) {
          errorDetail = errBody.error.message;
          if (/api.?key|unauthorized|invalid.*key|missing.*key/i.test(errorDetail)) {
            reason = 'not_configured';
          }
        }
      } catch { /* can't parse error body */ }

      // If no useful error message from the response, diagnose via FCC admin API
      if (!errorDetail || errorDetail.length < 5) {
        const diagnosis = await diagnoseFccFailure(fccBaseUrl, token, model);
        if (diagnosis) {
          return res.json({ ok: false, model, ...diagnosis });
        }
      }

      return res.json({
        ok: false,
        model,
        reason,
        error: errorDetail || `FCC returned ${testRes.status}. Check FCC Admin configuration.`,
      });
    }

    // No FCC — test through direct Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.json({
        ok: false,
        model,
        reason: 'not_configured',
        error: 'No ANTHROPIC_API_KEY configured',
      });
    }

    const testRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
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

    let errorDetail = `Anthropic API returned ${testRes.status}`;
    let reason = 'not_ready';
    try {
      const errBody = await testRes.json();
      if (errBody.error?.message) {
        errorDetail = errBody.error.message;
        if (/api.?key|unauthorized|invalid.*key/i.test(errorDetail)) {
          reason = 'not_configured';
        }
      }
    } catch { /* can't parse error body */ }

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
