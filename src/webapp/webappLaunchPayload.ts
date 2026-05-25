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
