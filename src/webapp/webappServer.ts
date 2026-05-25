import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { applyWebAppSettingsPatch, type WebAppSettingsPatch } from './settingsUpdate.js';
import { webAppSettingsDto } from './settingsSnapshot.js';
import { extractInitDataFromAuthHeader, validateTelegramInitData } from './telegramInitData.js';
import { webappListenPort, webappStaticRoot } from './webappConfig.js';

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

async function serveStatic(urlPath: string, res: ServerResponse): Promise<boolean> {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(webappStaticRoot(), safe);
  const root = path.resolve(webappStaticRoot());
  if (!filePath.startsWith(root)) {
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
  botToken: string,
  pathname: string,
): Promise<void> {
  const userId = resolveUserId(req, botToken);
  if (userId === null) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  if (pathname === '/api/webapp/settings' && req.method === 'GET') {
    json(res, 200, webAppSettingsDto(userId));
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
    json(res, 200, webAppSettingsDto(userId));
    return;
  }

  json(res, 404, { error: 'not_found' });
}

/** HTTP для Mini App «Настройки» (#55). */
export function startWebappServer(botToken: string): void {
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
        await handleApi(req, res, botToken, url.pathname);
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
