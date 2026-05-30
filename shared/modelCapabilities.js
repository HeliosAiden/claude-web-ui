/**
 * Centralized Model Capability Definitions
 *
 * Single source of truth for what each provider/model can handle.
 * Every capability check in the UI should go through these helpers.
 *
 * Adding a new capability (e.g. audioInput, videoInput):
 * 1. Add the key to the default records below
 * 2. Add default value in PROVIDER_DEFAULT_CAPABILITIES
 * 3. The existing helpers work automatically
 */

/**
 * Provider-level capability defaults.
 *
 * These apply to ALL models within a provider unless a model entry
 * in modelConstants.js explicitly sets `capabilities` to override.
 *
 * Rule: if >50% of the provider's models support a capability,
 * default it to true and override the few that don't.
 */
export const PROVIDER_DEFAULT_CAPABILITIES = {
  claude: { imageInput: true, fileInput: true },
  gemini: { imageInput: true, fileInput: true },
  codex:  { imageInput: true, fileInput: false },
  cursor: { imageInput: false, fileInput: false },
};

const FALSE_CAP = { imageInput: false, fileInput: false };

function providerDefault(provider) {
  return PROVIDER_DEFAULT_CAPABILITIES[provider] || FALSE_CAP;
}

/**
 * Return the resolved capabilities for the given provider + model combination.
 *
 * Resolution order:
 * 1. If the model value matches an entry in modelConstants.js that has
 *    an explicit `capabilities` field, that wins.
 * 2. Otherwise, fall back to the provider-level default.
 * 3. If the provider is unknown, returns all-false (safe default).
 *
 * @param {string} provider
 * @param {string|undefined} modelValue
 * @param {ReadonlyArray<{value:string, capabilities?:object}>} [modelOptions]
 * @returns {{imageInput:boolean, fileInput:boolean}}
 */
export function getModelCapabilities(provider, modelValue, modelOptions) {
  const defaults = providerDefault(provider);

  if (modelOptions && modelValue) {
    const found = modelOptions.find((m) => m.value === modelValue);
    if (found && found.capabilities) {
      return { ...defaults, ...found.capabilities };
    }
  }

  return defaults;
}

/**
 * Convenience: does the model support image attachments?
 *
 * @param {string} provider
 * @param {string} [modelValue]
 * @param {ReadonlyArray<{value:string, capabilities?:object}>} [modelOptions]
 * @returns {boolean}
 */
export function supportsImageInput(provider, modelValue, modelOptions) {
  return getModelCapabilities(provider, modelValue, modelOptions).imageInput;
}

/**
 * Convenience: does the model support file attachments?
 *
 * @param {string} provider
 * @param {string} [modelValue]
 * @param {ReadonlyArray<{value:string, capabilities?:object}>} [modelOptions]
 * @returns {boolean}
 */
export function supportsFileInput(provider, modelValue, modelOptions) {
  return getModelCapabilities(provider, modelValue, modelOptions).fileInput;
}
