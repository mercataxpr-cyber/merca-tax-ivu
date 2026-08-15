import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformAppSource, transformIndexSource } from './scripts/runtime-tax-transform.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function safeFile(rootDir, relative) {
  const resolvedRoot = path.resolve(rootDir);
  const file = path.resolve(resolvedRoot, relative);
  if (file !== resolvedRoot && !file.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  return file;
}

function canonicalRelativeFile(rootDir, file) {
  const resolvedRoot = path.resolve(rootDir);
  const relative = path.relative(resolvedRoot, file);
  if (!relative || relative === '.' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join('/');
}

function requestRelativePath(requestUrl) {
  const rawPath = String(requestUrl || '/').split('?')[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch (error) {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  return decoded.replace(/^\/+/, '') || 'index.html';
}

function sendError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

async function sendTransformedText(res, file, transform, contentType) {
  try {
    const source = await readFile(file, 'utf8');
    const output = transform(source);
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    res.end(output);
  } catch (error) {
    sendError(res, 500, `Runtime preparation failed: ${error.message}`);
  }
}

export function createMercaTaxServer({ rootDir = root } = {}) {
  return http.createServer(async (req, res) => {
    const relative = requestRelativePath(req.url);
    if (!relative) return sendError(res, 400, 'Bad request');

    const file = safeFile(rootDir, relative);
    if (!file) return sendError(res, 403, 'Forbidden');

    const canonicalRelative = canonicalRelativeFile(rootDir, file);
    if (!canonicalRelative) return sendError(res, 403, 'Forbidden');

    if (canonicalRelative === 'index.html') {
      return sendTransformedText(res, file, transformIndexSource, mime['.html']);
    }
    if (canonicalRelative === 'src/app.js') {
      return sendTransformedText(res, file, transformAppSource, mime['.js']);
    }

    const ext = path.extname(file).toLowerCase();
    const stream = createReadStream(file);
    stream.on('error', (error) => sendError(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Read failed'));
    stream.once('open', () => {
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      stream.pipe(res);
    });
    return undefined;
  });
}

export function startMercaTaxServer({ rootDir = root, port = Number(process.env.PORT || 4173) } = {}) {
  const server = createMercaTaxServer({ rootDir });
  return server.listen(port, '0.0.0.0', () => console.log(`MercaTax server on http://0.0.0.0:${port}`));
}

const invokedAsMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsMain) startMercaTaxServer();
