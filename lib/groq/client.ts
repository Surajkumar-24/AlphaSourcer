import { AI_MODELS, GROQ_CONFIG } from '@/config/models';

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

const MAX_ATTEMPTS = 4;
// A per-minute limit clears in seconds. A daily-quota 429 can report a
// Retry-After of many minutes — never block a search on that; fail fast so the
// caller can fall back to deterministic ranking.
const MAX_RETRY_WAIT_MS = 20000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Groq's free tier enforces a tokens-per-minute ceiling. A 429 means "come back
 * shortly", not "this candidate is unusable", so honour Retry-After and retry
 * rather than dropping work on the floor.
 */
export async function groqRequest<T = any>(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await groqRequestOnce<T>(messages, options);
    } catch (error) {
      lastError = error;
      const info = error as { status?: number; retryAfterMs?: number };
      if (info.status !== 429 || attempt === MAX_ATTEMPTS) throw error;

      if (info.retryAfterMs && info.retryAfterMs > MAX_RETRY_WAIT_MS) {
        console.warn(
          `Groq quota exhausted (retry in ${Math.round(info.retryAfterMs / 1000)}s); not waiting.`
        );
        throw error;
      }

      const waitMs = info.retryAfterMs ?? Math.min(2000 * 2 ** (attempt - 1), 15000);
      console.warn(`Groq rate limited; retrying in ${waitMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await sleep(waitMs);
    }
  }

  throw lastError;
}

async function groqRequestOnce<T = any>(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<T> {
  if (!GROQ_CONFIG.apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const model = AI_MODELS.primary;
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2000;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || JSON.stringify(error);
      } catch {
        errorMessage = await response.text();
      }

      const failure = new Error(`Groq API error: ${errorMessage}`) as Error & {
        status?: number;
        retryAfterMs?: number;
      };
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
        `[groq] ${data.usage.prompt_tokens} in + ${data.usage.completion_tokens} out = ${used} tokens (search total ${tokenLedger.total})`
      );
    }

    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('Groq response structure:', JSON.stringify(data, null, 2));
      throw new Error('No content in Groq response');
    }

    if (options?.jsonMode) {
      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        console.error('JSON parse error. Content was:', content);
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }

    return content as T;
  } catch (error) {
    console.error('Groq request failed:', error);
    throw error;
  }
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
