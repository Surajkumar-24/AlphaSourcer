import { AI_MODELS, GROQ_CONFIG } from '@/config/models';

export async function groqRequest<T = any>(
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
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Groq response');
    }

    if (options?.jsonMode) {
      return JSON.parse(content) as T;
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
