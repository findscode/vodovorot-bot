import { completeServiceChat } from './ai.js';
import { opsEvent } from './opsLog.js';

const CLARITY_SYSTEM_PROMPT = `Ты служебный фильтр для бота Таро. Оцени, достаточно ли конкретен вопрос или утверждение для расклада на три карты.
Ответь одной строкой JSON без markdown и без пояснений: {"needs_clarification":true|false,"hint":"..."}
Поле hint — на «ты», 1–2 коротких предложения, только если needs_clarification true; иначе пустая строка.
Не задавай вопросов пользователю — только hint для бота.`;

export type QuestionClarityResult = { action: 'proceed' } | { action: 'clarify'; hint: string };

export function parseClarityModelJson(
  raw: string,
): { needs_clarification: boolean; hint: string } | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      needs_clarification?: unknown;
      hint?: unknown;
    };
    if (typeof parsed.needs_clarification !== 'boolean') return null;
    const hint = typeof parsed.hint === 'string' ? parsed.hint : '';
    return { needs_clarification: parsed.needs_clarification, hint };
  } catch {
    return null;
  }
}

export function logQuestionClaritySkip(reason: string, detail?: string): void {
  opsEvent('question_clarity_skip', detail ? { reason, detail } : { reason });
}

export async function evaluateQuestionClarity(question: string): Promise<QuestionClarityResult> {
  const safeQ = question.replace(/"/g, "'");
  try {
    const raw = await completeServiceChat(
      CLARITY_SYSTEM_PROMPT,
      `Вопрос или утверждение пользователя:\n«${safeQ}»`,
      { max_tokens: 120, temperature: 0.2, opsContext: 'clarity' },
    );
    const parsed = parseClarityModelJson(raw);
    if (!parsed) {
      logQuestionClaritySkip('parse_error');
      return { action: 'proceed' };
    }
    if (parsed.needs_clarification && parsed.hint.trim()) {
      opsEvent('question_clarity_prompted');
      return { action: 'clarify', hint: parsed.hint.trim() };
    }
    return { action: 'proceed' };
  } catch (e) {
    logQuestionClaritySkip('ai_error', e instanceof Error ? e.message : String(e));
    return { action: 'proceed' };
  }
}
