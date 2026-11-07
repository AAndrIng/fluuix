/* Pruebas locales: no abren puertos, no consultan RPC y no usan dinero ni secretos reales.
 * NextResponse, viem y Postgres son dobles. Se ejecuta el TypeScript real del repositorio.
 * No reemplazan compilación completa, integración con Postgres ni pruebas de navegador.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHmac, randomUUID } from 'node:crypto';
import ts from 'typescript';

const resolveDependency = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = process.env.AUDIT_SOURCE_ROOT || path.resolve(__dirname, '..');
const origin = 'https://fluuix-audit.invalid';
const vault = '0x1111111111111111111111111111111111111111';
const wallet = '0x2222222222222222222222222222222222222222';
const secret = 'secreto-sintetico-solo-para-pruebas-locales-000000000000000000000000';

function environment(t, values = {}) {
  const vars = { NODE_ENV: 'production', APP_ORIGIN: origin, INTERCOMPANY_SESSION_SECRET: secret, ...values };
  const before = Object.fromEntries(Object.keys(vars).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => { for (const [key, value] of Object.entries(before)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
}

function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, 'utf8');
    const result = ts.transpileModule(source, {
      fileName: file, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
    const compiled = new Module(file);
    cache.set(file, compiled);
    compiled.filename = file;
    compiled.paths = Module._nodeModulePaths(path.dirname(file));
    compiled.require = spec => {
      if (Object.hasOwn(overrides, spec)) return overrides[spec];
      if (spec === 'next/server') return { NextResponse: {
        json(data, options = {}) {
          const cookies = new Map();
          return { data, status: options.status || 200, headers: options.headers, cookies: {
            set(name, value, settings) { cookies.set(name, { value, ...settings }); },
            get(name) { return cookies.get(name); },
          } };
        },
      } };
      if (spec.startsWith('.')) return load(path.resolve(path.dirname(file), spec + '.ts'));
      return resolveDependency(spec);
    };
    compiled._compile(result.outputText, file);
    return compiled.exports;
  }
  return relative => load(path.join(root, relative));
}

function request(body = '{}', extraHeaders = {}, url = origin + '/api/intercompany') {
  const headers = new Headers({ 'content-type': 'application/json', origin });
  for (const [key, value] of Object.entries(extraHeaders)) {
    if (value === null) headers.delete(key); else headers.set(key, value);
  }
  return new Request(url, { method: 'POST', headers, body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}) });
}
function status(code) { return error => error && error.status === code; }
function http() { return loader()('src/lib/server/http.ts'); }

const httpCases = [
  ['JSON válido', '{"ok":true}', {}, 0],
  ['array rechazado', '[]', {}, 400],
  ['JSON malformado', '{', {}, 400],
  ['texto no JSON', '{}', { 'content-type': 'text/plain' }, 415],
  ['origen ajeno', '{}', { origin: 'https://otro.invalid' }, 403],
  ['origen null', '{}', { origin: 'null' }, 403],
  ['origen ausente', '{}', { origin: null }, 403],
  ['Fetch Metadata cross-site', '{}', { 'sec-fetch-site': 'cross-site' }, 403],
  ['8193 bytes ASCII', JSON.stringify({ x: 'x'.repeat(8185) }), {}, 413],
  ['límite exacto de 8192 bytes', JSON.stringify({ x: 'x'.repeat(8184) }), {}, 0],
  ['UTF-8 supera bytes aunque no caracteres', JSON.stringify({ x: 'é'.repeat(5000) }), {}, 413],
  ['Content-Length incompatible', '{}', { 'content-length': '1' }, 400],
  ['cuerpo comprimido no admitido', '{}', { 'content-encoding': 'gzip' }, 415],
  ['MIME sin distinción de mayúsculas', '{}', { 'content-type': 'Application/JSON; charset=utf-8' }, 0],
];
for (const [name, body, headers, expected] of httpCases) test('HTTP: ' + name, async t => {
  environment(t);
  if (expected) await assert.rejects(http().readJson(request(body, headers)), status(expected));
  else assert.equal(typeof await http().readJson(request(body, headers)), 'object');
});

test('HTTP: Content-Length excesivo se rechaza sin consumir el cuerpo', async t => {
  environment(t); let pulls = 0;
  const stream = new ReadableStream({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(9000)); controller.close(); } }, { highWaterMark: 0 });
  await assert.rejects(http().readJson(request(stream, { 'content-length': '9000' })), status(413));
  assert.equal(pulls, 0);
});

test('HTTP: lectura por fragmentos se corta antes de consumir el resto', async t => {
  environment(t); let pulls = 0;
  const stream = new ReadableStream({ pull(controller) {
    pulls++;
    if (pulls <= 3) controller.enqueue(new Uint8Array(5000).fill(32)); else controller.close();
  } }, { highWaterMark: 0 });
  await assert.rejects(http().readJson(request(stream)), status(413));
  assert.equal(pulls, 2);
});

for (const [name, value] of [ ['ausente', undefined], ['HTTP remoto', 'http://fluuix-audit.invalid'], ['con ruta', origin + '/otra'], ['con credenciales', 'https://usuario:clave@fluuix-audit.invalid'] ]) {
  test('Configuración: rechaza APP_ORIGIN ' + name + ' en producción', t => {
    environment(t, { APP_ORIGIN: value });
    assert.throws(() => http().appOrigin(request()), status(503));
  });
}

test('Configuración: permite localhost HTTP en desarrollo', t => {
  environment(t, { APP_ORIGIN: undefined, NODE_ENV: 'development' });
  assert.equal(http().appOrigin(request('{}', {}, 'http://localhost:3000/api/intercompany')), 'http://localhost:3000');
});

const guardsExist = fs.existsSync(path.join(root, 'src/lib/server/request-guards.ts'));
test('HTTP: vence la lectura de un emisor que no entrega datos', { skip: !guardsExist }, async () => {
  const guards = loader()('src/lib/server/request-guards.ts');
  let cancelled = false;
  const stream = new ReadableStream({ cancel() { cancelled = true; } }, { highWaterMark: 0 });
  await assert.rejects(guards.readBoundedJson(request(stream), 20), status(408));
  assert.equal(cancelled, true);
});
test('HTTP: rechazo de UTF-8 inválido', { skip: !guardsExist }, async () => {
  const guards = loader()('src/lib/server/request-guards.ts');
  await assert.rejects(guards.readBoundedJson(request(new Uint8Array([0xff]))), status(400));
});

function fixture(overrides = {}) {
  const revoked = new Set();
  const challenges = new Set();
  const db = {
    async consumeChallenge(nonce) { if (challenges.has(nonce)) return false; challenges.add(nonce); return true; },
    async isSessionRevoked(nonce) { return revoked.has(nonce); },
    async revokeSession(nonce) { revoked.add(nonce); },
    ...overrides,
  };
  const load = loader({ './intercompany-db': db, './fuji': {
    vaultSettings() { return { vault, token: vault, deployedAt: 1n }; },
    async requireTreasurer() {},
  }, viem: { isAddress: value => /^0x[0-9a-f]{40}$/.test(value), verifyMessage: async () => true } });
  const sessions = load('src/lib/server/wallet-session.ts');
  const transport = load('src/lib/server/http.ts');
  function token(changes = {}, raw) {
    const payload = Buffer.from(raw === undefined ? JSON.stringify({ type: 'session', wallet, vault, origin,
      nonce: randomUUID(), expiresAt: Date.now() + 600000, ...changes }) : raw).toString('base64url');
    return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
  }
  function withCookie(value, name = 'fluuix_treasurer') {
    const req = request();
    req.cookies = { get(key) { return key === name ? { value } : undefined; } };
    return req;
  }
  return { sessions, transport, token, withCookie, revoked };
}

test('Sesión: acepta HMAC válido y sesión activa', async t => {
  environment(t); const f = fixture();
  assert.equal((await f.sessions.authorize(f.withCookie(f.token()))).wallet, wallet);
});
test('Sesión: rechaza cookie alterada', async t => {
  environment(t); const f = fixture();
  await assert.rejects(f.sessions.authorize(f.withCookie(f.token() + 'x')), status(401));
});
test('Sesión: rechaza credencial vencida', async t => {
  environment(t); const f = fixture();
  await assert.rejects(f.sessions.authorize(f.withCookie(f.token({ expiresAt: Date.now() - 1 }))), status(401));
});
test('Sesión: logout borra ambas cookies', async t => {
  environment(t); const f = fixture(); const response = await f.sessions.closeSession(f.withCookie(f.token()));
  assert.equal(response.cookies.get('fluuix_treasurer').maxAge, 0);
  assert.equal(response.cookies.get('fluuix_wallet_challenge').maxAge, 0);
});
test('Sesión: una copia del token no sirve después de logout', async t => {
  environment(t); const f = fixture(); const copied = f.token();
  await f.sessions.authorize(f.withCookie(copied));
  await f.sessions.closeSession(f.withCookie(copied));
  await assert.rejects(f.sessions.authorize(f.withCookie(copied)), status(401));
});
test('Sesión: falla cerrada si no se puede consultar revocación', async t => {
  environment(t); const f = fixture({ async isSessionRevoked() { throw new Error('Postgres no disponible'); } });
  const response = await f.transport.respond(async () => { await f.sessions.authorize(f.withCookie(f.token())); return f.transport.json({ ok: true }); });
  assert.equal(response.status, 503);
});
test('Sesión: no informa logout exitoso si falla la revocación', async t => {
  environment(t); const f = fixture({ async revokeSession() { throw new Error('Postgres no disponible'); } });
  const response = await f.transport.respond(() => f.sessions.closeSession(f.withCookie(f.token())));
  assert.equal(response.status, 503);
});
test('Sesión: credencial firmada con esquema inválido se rechaza', async t => {
  environment(t); const f = fixture();
  await assert.rejects(f.sessions.authorize(f.withCookie(f.token({ nonce: 'no-es-uuid' }))), status(401));
});
test('Sesión: JSON autenticado malformado no genera error interno', async t => {
  environment(t); const f = fixture();
  await assert.rejects(f.sessions.authorize(f.withCookie(f.token({}, '{'))), status(401));
});
test('Sesión: el desafío de firma se consume una única vez', async t => {
  environment(t); const f = fixture();
  const first = await f.sessions.startOrVerifySession(f.withCookie(''), { wallet });
  const challenge = first.cookies.get('fluuix_wallet_challenge').value;
  const signed = { wallet, signature: '0x' + '11'.repeat(65) };
  const response = await f.sessions.startOrVerifySession(f.withCookie(challenge, 'fluuix_wallet_challenge'), signed);
  assert.equal(response.cookies.get('fluuix_treasurer').httpOnly, true);
  assert.equal(response.cookies.get('fluuix_treasurer').secure, true);
  await assert.rejects(f.sessions.startOrVerifySession(f.withCookie(challenge, 'fluuix_wallet_challenge'), signed), status(401));
});

test('Cabeceras: niega iframe sin bloquear scripts de Next.js', async () => {
  const config = loader()('next.config.ts').default;
  const rules = await config.headers();
  const headers = Object.fromEntries(rules[0].headers.map(h => [h.key, h.value]));
  assert.equal(config.poweredByHeader, false);
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});

const dbSource = fs.readFileSync(path.join(root, 'src/lib/server/intercompany-db.ts'), 'utf8');
test('Postgres: revocación usa parámetros y operación idempotente', { skip: !dbSource.includes('export async function revokeSession') }, async t => {
  environment(t, { DATABASE_URL: 'postgresql://no-se-usa-en-red' });
  const calls = [];
  const db = loader({ pg: { Pool: class { async query(sql, params) { calls.push({ sql, params }); return { rows: [{ found: 1 }] }; } } } })('src/lib/server/intercompany-db.ts');
  const nonce = randomUUID(); const expiry = Date.now() + 300000;
  await db.revokeSession(nonce, expiry);
  assert.match(calls[1].sql, /VALUES \(\$1,\$2\)/);
  assert.match(calls[1].sql, /ON CONFLICT/);
  assert.equal(calls[1].params[0], nonce);
  assert.equal(calls[1].params[1].getTime(), expiry);
  assert.equal(await db.isSessionRevoked(nonce), true);
  assert.equal(calls[2].params[0], nonce);
});
