export type ModelSpec = {
  id: string;
  /**
   * Scales max_tokens for this model. Reasoning-heavy models spend a large
   * share of the completion budget before emitting any JSON, so a cap tuned
   * for one model truncates another mid-object.
   */
  tokenMultiplier: number;
};

/**
 * Multiple API keys, comma-separated. When one key is rate-limited the client
 * rotates to the next, multiplying free-tier capacity without any code change
 * on the caller side.
 *
 * Set in .env.local:
 *   GROQ_API_KEY=key1,key2,key3
 */
function parseKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((k) => k.trim()).filter(Boolean);
}

const groqKeys = parseKeys(process.env.GROQ_API_KEY);
let groqKeyIndex = 0;

export function getGroqApiKey(): string | undefined {
  if (groqKeys.length === 0) return undefined;
  return groqKeys[groqKeyIndex % groqKeys.length];
}

/** Rotate to the next API key (called on 429). */
export function rotateGroqApiKey(): string | undefined {
  if (groqKeys.length <= 1) return getGroqApiKey();
  groqKeyIndex = (groqKeyIndex + 1) % groqKeys.length;
  console.log(`[groq] rotated to API key #${groqKeyIndex + 1} of ${groqKeys.length}`);
  return groqKeys[groqKeyIndex];
}

/**
 * Tried in order. Groq meters rate limits per model, so falling through is not
 * only resilience against a decommissioned or failing model — it also unlocks a
 * fresh token budget when one model is exhausted.
 *
 * Deliberately excludes groq/compound*, which routes to gpt-oss-120b internally
 * and therefore shares its quota.
 */
const DEFAULT_CHAIN: ModelSpec[] = [
  { id: 'openai/gpt-oss-120b', tokenMultiplier: 1 },
  { id: 'openai/gpt-oss-20b', tokenMultiplier: 1 },
  // Was qwen/qwen3.6-27b. That model is documented by Groq, but calling it
  // with the keys used here returns "model not found -- may not be available
  // or may require special access", so the last line of defence would have
  // failed exactly when the first two models are rate-limited, which on the
  // free tier is precisely when it is needed.
  //
  // If an account DOES have access to 3.6, set GROQ_MODEL_CHAIN in the
  // environment rather than editing this list -- the chain is meant to be
  // configurable per deployment.
  { id: 'qwen/qwen3.8-27b', tokenMultiplier: 1.8 },
];

function parseChain(raw: string | undefined): ModelSpec[] | null {
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  return ids.map((id) => {
    const known = DEFAULT_CHAIN.find((m) => m.id === id);
    return { id, tokenMultiplier: known?.tokenMultiplier ?? 1.5 };
  });
}

/** GROQ_MODEL_CHAIN overrides the whole chain; GROQ_PRIMARY_MODEL just the head. */
export function getModelChain(): ModelSpec[] {
  const override = parseChain(process.env.GROQ_MODEL_CHAIN);
  if (override) return override;

  const primary = process.env.GROQ_PRIMARY_MODEL;
  if (!primary) return DEFAULT_CHAIN;

  const rest = DEFAULT_CHAIN.filter((m) => m.id !== primary);
  const head = DEFAULT_CHAIN.find((m) => m.id === primary) ?? {
    id: primary,
    tokenMultiplier: 1,
  };
  return [head, ...rest];
}

export const AI_MODELS = {
  primary: process.env.GROQ_PRIMARY_MODEL || DEFAULT_CHAIN[0].id,
  extraction: process.env.GROQ_EXTRACTION_MODEL || DEFAULT_CHAIN[0].id,
};

export const GROQ_CONFIG = {
  get apiKey() { return getGroqApiKey(); },
  baseURL: 'https://api.groq.com/openai/v1',
};

const serperKeys = parseKeys(process.env.SERPER_API_KEY);
let serperKeyIndex = 0;

export function getSerperApiKey(): string | undefined {
  if (serperKeys.length === 0) return undefined;
  return serperKeys[serperKeyIndex % serperKeys.length];
}

/** Rotate to the next Serper API key (called on 429 or credit exhaustion). */
export function rotateSerperApiKey(): string | undefined {
  if (serperKeys.length <= 1) return getSerperApiKey();
  serperKeyIndex = (serperKeyIndex + 1) % serperKeys.length;
  console.log(`[serper] rotated to API key #${serperKeyIndex + 1} of ${serperKeys.length}`);
  return serperKeys[serperKeyIndex];
}

export const SERPER_CONFIG = {
  get apiKey() { return getSerperApiKey(); },
  baseURL: 'https://google.serper.dev',
};
