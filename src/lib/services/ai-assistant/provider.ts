'server-only';

import { env } from '@/lib/env';
import { logRedacted } from '@/lib/log';

export type AiMessage = {
  readonly role: 'user' | 'model';
  readonly content: string;
};

export type AiResponse = {
  readonly text: string;
  readonly usedAi: boolean;
  readonly error?: string;
};

export interface AiProvider {
  chat(systemPrompt: string, history: readonly AiMessage[], userMessage: string): Promise<AiResponse>;
}

// ── NullProvider (fallback cuando no hay API key) ─────────────────────

class NullProvider implements AiProvider {
  async chat(): Promise<AiResponse> {
    return {
      text: 'El asistente IA no está disponible porque GEMINI_API_KEY no está configurada. Contacta con el administrador.',
      usedAi: false,
      error: 'GEMINI_API_KEY not configured',
    };
  }
}

// ── GeminiProvider ────────────────────────────────────────────────────

class GeminiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async chat(systemPrompt: string, history: readonly AiMessage[], userMessage: string): Promise<AiResponse> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemPrompt,
      });

      const geminiHistory = history.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({ history: geminiHistory });
      const result = await chat.sendMessage(userMessage);
      const text = result.response.text();

      logRedacted('info', '[ai-assistant] Gemini response length:', text.length);
      return { text, usedAi: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logRedacted('error', '[ai-assistant] Gemini error:', msg);
      const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
      return {
        text: isQuota
          ? 'El límite de peticiones de Gemini ha sido alcanzado. Espera un momento e inténtalo de nuevo.'
          : 'Error al conectar con el asistente IA. Por favor, inténtalo de nuevo.',
        usedAi: false,
        error: msg,
      };
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────

let _provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (_provider) return _provider;
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    _provider = new NullProvider();
  } else {
    _provider = new GeminiProvider(apiKey, env.GEMINI_MODEL ?? 'gemini-2.0-flash');
  }
  return _provider;
}
