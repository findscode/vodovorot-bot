import type { Telegraf } from 'telegraf';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { applyWebAppSettingsPatch, type WebAppSettingsPatch } from './settingsUpdate.js';
import { webAppSettingsDto } from './settingsSnapshot.js';
import { extractInitDataFromAuthHeader, validateTelegramInitData } from './telegramInitData.js';
import { webappListenPort, webappStaticRoot } from './webappConfig.js';
import { parseWebAppLaunchBody } from './webappLaunchPayload.js';
import { runWebAppReadingLaunch } from './webappLaunchHandler.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function resolveUserId(req: IncomingMessage, botToken: string): number | null {
  const header =
    extractInitDataFromAuthHeader(req.headers.authorization) ||
    (typeof req.headers['x-telegram-init-data'] === 'string'
      ? req.headers['x-telegram-init-data']
      : null);
  if (!header) return null;
  return validateTelegramInitData(header, botToken);
}

function staticRelPath(urlPath: string): string {
  if (urlPath === '/' || urlPath === '') return 'index.html';
  return urlPath.replace(/^\/+/, '');
}

async function serveStatic(urlPath: string, res: ServerResponse): Promise<boolean> {
  const root = path.resolve(webappStaticRoot());
  const filePath = path.resolve(root, staticRelPath(urlPath));
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403);
    res.end();
    return true;
  }
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  bot: Telegraf,
  botToken: string,
  pathname: string,
): Promise<void> {
  const userId = resolveUserId(req, botToken);
  if (userId === null) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  if (pathname === '/api/webapp/settings' && req.method === 'GET') {
    json(res, 200, await webAppSettingsDto(userId));
    return;
  }

  if (pathname === '/api/webapp/settings' && req.method === 'PATCH') {
    let patch: WebAppSettingsPatch;
    try {
      const raw = await readBody(req);
      patch = raw ? (JSON.parse(raw) as WebAppSettingsPatch) : {};
    } catch {
      json(res, 400, { error: 'invalid_json' });
      return;
    }
    const result = applyWebAppSettingsPatch(userId, patch);
    if (!result.ok) {
      json(res, 400, { error: result.error });
      return;
    }
    json(res, 200, await webAppSettingsDto(userId));
    return;
  }

  if (pathname === '/api/webapp/launch' && req.method === 'POST') {
    let body: unknown;
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch {
      json(res, 400, { error: 'invalid_json' });
      return;
    }
    const action = parseWebAppLaunchBody(body);
    if (!action) {
      json(res, 400, { error: 'invalid_action' });
      return;
    }
    try {
      await runWebAppReadingLaunch(bot.telegram, userId, action);
      json(res, 200, { ok: true, action });
    } catch {
      json(res, 500, { error: 'launch_failed' });
    }
    return;
  }

  json(res, 404, { error: 'not_found' });
}

/** HTTP для Mini App «Меню» (#55, #4.4). */
export function startWebappServer(bot: Telegraf, botToken: string): void {
  const port = webappListenPort();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ok');
        return;
      }
      if (url.pathname.startsWith('/api/webapp/')) {
        await handleApi(req, res, bot, botToken, url.pathname);
        return;
      }
      const served = await serveStatic(url.pathname, res);
      if (!served) {
        res.writeHead(404);
        res.end('Not found');
      }
    } catch (e) {
      console.error('[webapp_error]', e instanceof Error ? e.message : e);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal error');
      }
    }
  });

  server.listen(port, () => {
    console.log(`Mini App HTTP: :${port} (static ${webappStaticRoot()})`);
  });
}
