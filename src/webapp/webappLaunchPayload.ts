export type WebAppLaunchAction = 'day' | 'spread' | 'deep';

export function parseWebAppLaunchPayload(raw: string): WebAppLaunchAction | null {
  try {
    const parsed = JSON.parse(raw) as { action?: unknown };
    if (parsed.action === 'day' || parsed.action === 'spread' || parsed.action === 'deep') {
      return parsed.action;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function parseWebAppLaunchBody(body: unknown): WebAppLaunchAction | null {
  if (typeof body === 'object' && body !== null && 'action' in body) {
    const action = (body as { action: unknown }).action;
    if (action === 'day' || action === 'spread' || action === 'deep') {
      return action;
    }
  }
  return null;
}
