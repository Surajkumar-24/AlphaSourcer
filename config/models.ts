export const AI_MODELS = {
  primary: process.env.GROQ_PRIMARY_MODEL || 'mixtral-8x7b-32768',
  extraction: process.env.GROQ_EXTRACTION_MODEL || 'mixtral-8x7b-32768',
};

export const GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
};

export const SERPER_CONFIG = {
  apiKey: process.env.SERPER_API_KEY,
  baseURL: 'https://google.serper.dev',
};
