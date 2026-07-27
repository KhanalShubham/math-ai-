import { env } from './env';

export type AiProvider = 'ollama' | 'openai' | 'claude' | 'gemini';

export interface AiConfig {
  provider: AiProvider;
  ollama: {
    baseUrl: string;
    model: string;
  };
}

export const aiConfig: Readonly<AiConfig> = Object.freeze({
  provider: env.AI_PROVIDER,
  ollama: {
    baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
  },
});
