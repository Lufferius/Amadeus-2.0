import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? 5173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

function resolvePath(url) {
  const requested = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const relative = requested === '/' ? 'index.html' : requested.slice(1);
  const fullPath = normalize(join(root, relative));

  if (!fullPath.startsWith(root)) {
    return null;
  }

  return fullPath;
}

createServer(async (request, response) => {
  const filePath = resolvePath(request.url);

  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, () => {
  console.log(`Amadeus Learning Coach running at http://localhost:${port}`);
});
