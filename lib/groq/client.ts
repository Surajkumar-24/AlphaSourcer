import { GROQ_CONFIG, getModelChain, ModelSpec } from '@/config/models';

/** Per-search token accounting, so quota use is measurable rather than guessed. */
export const tokenLedger = {
  total: 0,
  reset() {
    this.total = 0;
  },
  add(n: number) {
    this.total += n;
  },
};

const MAX_ATTEMPTS_PER_MODEL = 3;
// A per-minute limit clears in seconds. A daily-quota 429 reports a Retry-After
// of many minutes — switch models instead of blocking the search on it.
const MAX_RETRY_WAIT_MS = 20000;

type GroqError = Error & { status?: number; retryAfterMs?: number };

/**
 * Models proven unusable this process (decommissioned, no access). Remembered
 * so a dead model is probed once rather than on every call.
 */
const unusableModels = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when the model itself is the problem, so retrying it is pointless. */
function isModelUnusable(error: GroqError): boolean {
  if (error.status === 404) return true;
  const message = error.message.toLowerCase();
  return (
    message.includes('decommission') ||
    message.includes('does not exist') ||
    message.includes('do not have access') ||
    message.includes('model_not_found')
  );
}

export interface GroqOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

/**
 * Sends a request through the model chain. A model is abandoned when it is
 * decommissioned, out of daily quota, or repeatedly failing, and the next one
 * is tried. Groq meters limits per model, so this also buys extra capacity.
 */
export async function groqRequest<T = any>(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options?: GroqOptions
): Promise<T> {
  if (!GROQ_CONFIG.apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const chain = getModelChain();
  let lastError: unknown = null;

  const usable = chain.filter((m) => !unusableModels.has(m.id));
  const candidates = usable.length > 0 ? usable : chain; // all dead: re-probe

  for (const model of candidates) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const result = await groqRequestOnce<T>(model, messages, options);
        if (model.id !== chain[0].id) {
          console.warn(`[groq] served by fallback model ${model.id}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        const info = error as GroqError;

        if (isModelUnusable(info)) {
          unusableModels.add(model.id);
          console.warn(`[groq] ${model.id} unusable (${info.message.slice(0, 80)}); skipping from now on`);
          break;
        }

        if (info.status === 429) {
          const waitMs = info.retryAfterMs ?? Math.min(2000 * 2 ** (attempt - 1), 15000);

          if (waitMs > MAX_RETRY_WAIT_MS) {
            console.warn(
              `[groq] ${model.id} quota exhausted (retry in ${Math.round(waitMs / 1000)}s); trying next model`
            );
            break;
          }

          if (attempt < MAX_ATTEMPTS_PER_MODEL) {
            console.warn(`[groq] ${model.id} rate limited; retrying in ${waitMs}ms`);
            await sleep(waitMs);
            continue;
          }
          break;
        }

        // Malformed output is often model-specific — worth trying the next one.
        console.warn(`[groq] ${model.id} failed: ${info.message.slice(0, 80)}`);
        break;
      }
    }
  }

  throw lastError ?? new Error('All Groq models failed');
}

async function groqRequestOnce<T = any>(
  model: ModelSpec,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options?: GroqOptions
): Promise<T> {
  const temperature = options?.temperature ?? 0.7;
  const baseTokens = options?.maxTokens ?? 2000;
  const maxTokens = Math.round(baseTokens * model.tokenMultiplier);

  const response = await fetch(`${GROQ_CONFIG.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Unknown error';
    try {
      const body = await response.json();
      errorMessage = body.error?.message || JSON.stringify(body);
    } catch {
      errorMessage = await response.text();
    }

    const failure = new Error(`Groq API error: ${errorMessage}`) as GroqError;
    failure.status = response.status;

    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds)) failure.retryAfterMs = Math.ceil(seconds * 1000);
    }

    throw failure;
  }

  const data = await response.json();

  const used = data.usage?.total_tokens ?? 0;
  if (used) {
    tokenLedger.add(used);
    console.log(
      `[groq] ${model.id}: ${data.usage.prompt_tokens} in + ${data.usage.completion_tokens} out = ${used} (search total ${tokenLedger.total})`
    );
  }

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in Groq response');
  }

  if (options?.jsonMode) {
    try {
      return JSON.parse(content) as T;
    } catch (parseError) {
      throw new Error(
        `Failed to parse JSON from ${model.id}: ${
          parseError instanceof Error ? parseError.message : 'unknown'
        }`
      );
    }
  }

  return content as T;
}

export function createSystemMessage(role: string): string {
  return `You are an experienced ${role}. You must:
- Prefer precision over unnecessary expansion
- Generate diverse strategies
- Avoid hallucinating information
- Distinguish confirmed facts from inferences
- Use only available evidence
- Return valid JSON when requested`;
}
