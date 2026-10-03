// ---------------------------------------------------------------------------
// Provider & model configuration
//
// Supports multiple LLM providers (Groq, OpenRouter, Cerebras) with automatic
// failover. Each provider can have multiple comma-separated API keys that
// rotate on rate-limit (429).
//
// .env.local:
//   GROQ_API_KEY=key1,key2
//   OPENROUTER_API_KEY=your_key
//   CEREBRAS_API_KEY=your_key
// ---------------------------------------------------------------------------

// ── Key pool (shared helper) ───────────────────────────────────────────────

function parseKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((k) => k.trim()).filter(Boolean);
}

interface KeyPool {
  keys: string[];
  index: number;
}

function createKeyPool(envVar: string | undefined): KeyPool {
  return { keys: parseKeys(envVar), index: 0 };
}

function currentKey(pool: KeyPool): string | undefined {
  if (pool.keys.length === 0) return undefined;
  return pool.keys[pool.index % pool.keys.length];
}

function rotateKey(pool: KeyPool, label: string): string | undefined {
  if (pool.keys.length <= 1) return currentKey(pool);
  pool.index = (pool.index + 1) % pool.keys.length;
  console.log(`[${label}] rotated to API key #${pool.index + 1} of ${pool.keys.length}`);
  return pool.keys[pool.index];
}

// ── Provider definitions ───────────────────────────────────────────────────

export type ProviderName = 'groq' | 'openrouter' | 'cerebras';

export interface ProviderConfig {
  name: ProviderName;
  baseURL: string;
  keyPool: KeyPool;
  /** Whether this provider is configured (has at least one key). */
  available: boolean;
}

const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  groq: {
    name: 'groq',
    baseURL: 'https://api.groq.com/openai/v1',
    keyPool: createKeyPool(process.env.GROQ_API_KEY),
    get available() { return this.keyPool.keys.length > 0; },
  },
  openrouter: {
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    keyPool: createKeyPool(process.env.OPENROUTER_API_KEY),
    get available() { return this.keyPool.keys.length > 0; },
  },
  cerebras: {
    name: 'cerebras',
    baseURL: 'https://api.cerebras.ai/v1',
    keyPool: createKeyPool(process.env.CEREBRAS_API_KEY),
    get available() { return this.keyPool.keys.length > 0; },
  },
};

export function getProvider(name: ProviderName): ProviderConfig {
  return PROVIDERS[name];
}

export function getProviderApiKey(name: ProviderName): string | undefined {
  return currentKey(PROVIDERS[name].keyPool);
}

export function rotateProviderApiKey(name: ProviderName): string | undefined {
  return rotateKey(PROVIDERS[name].keyPool, name);
}

// ── Model specification ────────────────────────────────────────────────────

export type ModelSpec = {
  id: string;
  provider: ProviderName;
  /**
   * Scales max_tokens for this model. Reasoning-heavy models spend a large
   * share of the completion budget before emitting any JSON, so a cap tuned
   * for one model truncates another mid-object.
   */
  tokenMultiplier: number;
};

// ── Default model chain ────────────────────────────────────────────────────

/**
 * Tried in order. When a model or provider is rate-limited, the next one is
 * tried — across models AND across providers. This means:
 *
 *   Groq key1 → Groq key2 (rotation) → next Groq model → OpenRouter → Cerebras
 *
 * Providers without a configured key are automatically skipped.
 */
const ALL_MODELS: ModelSpec[] = [
  // ── Groq (primary) ──
  { id: 'openai/gpt-oss-120b', provider: 'groq', tokenMultiplier: 1 },
  { id: 'openai/gpt-oss-20b', provider: 'groq', tokenMultiplier: 1 },
  { id: 'qwen/qwen3.8-27b', provider: 'groq', tokenMultiplier: 1.8 },

  // ── OpenRouter (free models, separate rate limit) ──
  { id: 'qwen/qwen3-30b-a3b:free', provider: 'openrouter', tokenMultiplier: 1.5 },
  { id: 'deepseek/deepseek-r1-0528:free', provider: 'openrouter', tokenMultiplier: 2 },
  { id: 'meta-llama/llama-4-maverick:free', provider: 'openrouter', tokenMultiplier: 1.5 },

  // ── Cerebras (fastest inference, free tier) ──
  { id: 'llama-3.3-70b', provider: 'cerebras', tokenMultiplier: 1 },
];

/** Only models whose provider has a key configured. */
function availableModels(): ModelSpec[] {
  return ALL_MODELS.filter((m) => PROVIDERS[m.provider].available);
}

// ── Chain construction ─────────────────────────────────────────────────────

function parseChain(raw: string | undefined): ModelSpec[] | null {
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  return ids.map((id) => {
    const known = ALL_MODELS.find((m) => m.id === id);
    return known ?? { id, provider: 'groq' as ProviderName, tokenMultiplier: 1.5 };
  }).filter((m) => PROVIDERS[m.provider].available);
}

/** GROQ_MODEL_CHAIN overrides the whole chain; GROQ_PRIMARY_MODEL just the head. */
export function getModelChain(): ModelSpec[] {
  const override = parseChain(process.env.GROQ_MODEL_CHAIN);
  if (override && override.length > 0) return override;

  const all = availableModels();
  if (all.length === 0) {
    // Nothing configured at all — return Groq defaults so the error message
    // is about a missing key rather than an empty chain.
    return ALL_MODELS.filter((m) => m.provider === 'groq');
  }

  const primary = process.env.GROQ_PRIMARY_MODEL;
  if (!primary) return all;

  const head = all.find((m) => m.id === primary);
  const rest = all.filter((m) => m.id !== primary);
  return head ? [head, ...rest] : all;
}

// ── Legacy exports (backward compatibility) ────────────────────────────────

export const AI_MODELS = {
  primary: process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-120b',
  extraction: process.env.GROQ_EXTRACTION_MODEL || 'openai/gpt-oss-120b',
};

/** @deprecated Use getProvider('groq') instead. Kept for existing imports. */
export const GROQ_CONFIG = {
  get apiKey() { return getProviderApiKey('groq'); },
  baseURL: 'https://api.groq.com/openai/v1',
};

/** Rotate the Groq key pool. */
export function rotateGroqApiKey(): string | undefined {
  return rotateProviderApiKey('groq');
}

// ── Serper (search API, unchanged) ─────────────────────────────────────────

const serperPool = createKeyPool(process.env.SERPER_API_KEY);

export function getSerperApiKey(): string | undefined {
  return currentKey(serperPool);
}

export function rotateSerperApiKey(): string | undefined {
  return rotateKey(serperPool, 'serper');
}

export const SERPER_CONFIG = {
  get apiKey() { return getSerperApiKey(); },
  baseURL: 'https://google.serper.dev',
};
