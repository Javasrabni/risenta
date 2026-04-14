export type AIRequestType =
  | 'auto-generate'
  | 'improve'
  | 'paraphrase'
  | 'expand'
  | 'summarize'
  | 'canvas-prompt'
  | 'analyze-content';

export interface AIRequestPayload {
  prompt?: string;
  type?: AIRequestType;
  topic?: string;
  length?: 'short' | 'medium' | 'long';
  currentContent?: string;
  content?: string;
  templatePrompt?: string;
}

const ALLOWED_TYPES = new Set<AIRequestType>([
  'auto-generate',
  'improve',
  'paraphrase',
  'expand',
  'summarize',
  'canvas-prompt',
  'analyze-content',
]);

function clip(input: string, max = 16000): string {
  return input.length > max ? input.slice(0, max) : input;
}

export function validateAIRequest(body: unknown): { ok: true; data: AIRequestPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body tidak valid' };
  }

  const payload = body as AIRequestPayload;
  const type = payload.type || 'canvas-prompt';
  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, error: 'Tipe AI request tidak didukung' };
  }

  const normalized: AIRequestPayload = {
    type,
    prompt: clip((payload.prompt || '').toString()),
    topic: clip((payload.topic || '').toString(), 512),
    length: payload.length || 'medium',
    currentContent: clip((payload.currentContent || '').toString()),
    content: clip((payload.content || '').toString()),
    templatePrompt: clip((payload.templatePrompt || '').toString()),
  };

  if (type !== 'auto-generate' && type !== 'analyze-content' && !normalized.prompt) {
    return { ok: false, error: 'Prompt wajib diisi' };
  }

  return { ok: true, data: normalized };
}

export function sanitizeAIHtmlOutput(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .trim();
}

export function parseAIJsonObject(raw: string): Record<string, unknown> | null {
  const matched = raw.match(/\{[\s\S]*\}/);
  if (!matched) return null;
  try {
    return JSON.parse(matched[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
