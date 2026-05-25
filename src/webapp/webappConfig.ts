/** Публичный HTTPS-URL Mini App (без trailing slash), напр. https://bot.example.com/webapp */
export function webappPublicBaseUrl(): string | null {
  const explicit = process.env.WEBAPP_PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const domain = process.env.WEBAPP_DOMAIN?.trim();
  if (!domain) return null;

  const pathSuffix = (process.env.WEBAPP_PATH ?? '/webapp').replace(/\/$/, '') || '/webapp';
  return `https://${domain}${pathSuffix}`;
}

/** Полный URL страницы настроек для кнопки WebApp. */
export function webappSettingsUrl(): string | null {
  const base = webappPublicBaseUrl();
  return base ? `${base}/` : null;
}

export function webappListenPort(): number {
  const n = Number(process.env.WEBAPP_PORT ?? '8080');
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : 8080;
}

export function webappPrivacyUrl(): string {
  return (
    process.env.WEBAPP_PRIVACY_URL?.trim() ||
    'https://github.com/findscode/vodovorot-bot/blob/main/docs/PRIVACY.md'
  );
}

/** Корень статики Mini App (от cwd процесса). */
export function webappStaticRoot(): string {
  return process.env.WEBAPP_STATIC_DIR?.trim() || 'webapp/public';
}
