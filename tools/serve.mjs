#!/usr/bin/env node
/**
 * Minimale statische server voor de demo (geen dependencies).
 * Gebruik: node tools/serve.mjs [poort]   →  http://localhost:8080
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "target", "web");
const port = Number(process.argv[2] || process.env.PORT || 8080);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".teadbg": "application/octet-stream",
  ".map": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.join(root, path.normalize(relative).replace(/^(\.\.[/\\])+/, ""));

  if (!file.startsWith(root)) {
    res.writeHead(403).end("verboden");
    return;
  }

  try {
    const body = await fs.readFile(file);
    res.writeHead(200, {
      "content-type": types[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Niet gevonden: ${relative}\nHeb je 'mvn process-classes' gedraaid?`);
  }
});

server.listen(port, () => {
  console.log(`Demo draait op http://localhost:${port}  (root: ${root})`);
});
