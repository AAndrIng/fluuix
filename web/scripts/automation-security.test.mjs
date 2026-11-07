/** Auditoría aislada: código real, RPC/DB/wallet/hash Ethereum simulados.
 * No ejecuta Solidity, no valida criptografía Ethereum, no envía transacciones.
 * El doble SQL comprueba el flujo esperado, NO la atomicidad real de Postgres.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const root = process.env.AUDIT_SOURCE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolveDependency = createRequire(import.meta.url);
const vault = `0x${'1'.repeat(40)}`;
const wallet = `0x${'2'.repeat(40)}`;
const runId = '12345678-1234-4234-8234-123456789abc';
const UNIT = 10n ** 18n;
const units = (hundredths) => (BigInt(hundredths) * UNIT / 100n).toString();
const accounts = [
  { id: 0, nombre: 'Caja central', saldo: units(950) },
  { id: 1, nombre: 'Local Palermo', saldo: units(50) },
];
const reserves = new Map([[0, 5n * UNIT]]);
const loan = { sourceId: 0, sourceName: 'Caja central', destinationId: 1, destinationName: 'Local Palermo', amount: units(150), rateBps: 500 };
const threshold = 75n * UNIT / 100n;
// Doble determinístico: no es keccak y no se presenta como validación criptográfica.
const fakeHash = bytes => `0x${createHash('sha256').update(bytes).digest('hex')}`;

function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    const compiled = new Module(file);
    cache.set(file, compiled);
    compiled.filename = file;
    compiled.paths = Module._nodeModulePaths(path.dirname(file));
    compiled.require = spec => {
      if (Object.hasOwn(overrides, spec)) return overrides[spec];
      if (spec.startsWith('.')) return load(path.resolve(path.dirname(file), spec.endsWith('.ts') ? spec : spec + '.ts'));
      return resolveDependency(spec);
    };
    compiled._compile(result.outputText, file);
    return compiled.exports;
  }
  return relative => load(path.join(root, relative));
}
const domain = loader()('src/lib/treasury-automation.ts');

test('Política: conserva una propuesta legítima de 1,5 mARGt', () => {
  assert.equal(domain.proposalStillValid(accounts, reserves, threshold, loan), true);
});
for (const [name, patch] of [
  ['importe cero', { amount: '0' }],
  ['importe negativo', { amount: '-1' }],
  ['importe no numérico', { amount: 'invalido' }],
  ['importe con ceros ambiguos', { amount: '01' }],
  ['importe excesivamente largo', { amount: '9'.repeat(1000) }],
  ['tasa distinta de la política', { rateBps: 9000 }],
]) test('Política: rechaza ' + name, () => {
  assert.equal(domain.proposalStillValid(accounts, reserves, threshold, { ...loan, ...patch }), false);
});
test('Política: no acepta cambiar Palermo por otra operativa', () => {
  assert.equal(domain.proposalStillValid([...accounts, { id: 2, nombre: 'Otra', saldo: units(50) }], reserves, threshold, { ...loan, destinationId: 2 }), false);
});
test('Política: origen y destino no pueden coincidir', () => {
  assert.equal(domain.proposalStillValid(accounts, new Map([[1, 0n]]), threshold, { ...loan, sourceId: 1, amount: units(10) }), false);
});
test('Política: no admite saldos negativos aunque alcancen el objetivo aparente', () => {
  assert.equal(domain.proposalStillValid([accounts[0], { ...accounts[1], saldo: '-1' }], reserves, threshold, loan), false);
});
test('Política: no admite IDs duplicados ni reservas negativas', () => {
  assert.equal(domain.proposalStillValid([...accounts, accounts[1]], reserves, threshold, loan), false);
  assert.equal(domain.proposalStillValid(accounts, new Map([[0, -1n]]), threshold, loan), false);
});
test('Política: umbral dentro de 25 a 100 centésimos y sin fracciones menores', () => {
  assert.equal(domain.proposalStillValid(accounts, reserves, 2n * UNIT, loan), false);
  assert.equal(domain.proposalStillValid(accounts, reserves, threshold + 1n, loan), false);
  assert.equal(domain.proposalStillValid(accounts, reserves, 24n * UNIT / 100n, loan), false);
});
test('Política: falla cerrado ante saldos corruptos o IDs inseguros', () => {
  assert.equal(domain.proposalStillValid([{ ...accounts[0], saldo: 'oops' }, accounts[1]], reserves, threshold, loan), false);
  const unsafe = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(domain.proposalStillValid([{ ...accounts[0], id: unsafe }, accounts[1]], new Map([[unsafe, 0n]]), threshold, { ...loan, sourceId: unsafe }), false);
});
test('Política: mantiene el límite de 2 tokens y las reservas', () => {
  assert.equal(domain.proposalStillValid(accounts, reserves, threshold, { ...loan, amount: units(201) }), false);
  assert.equal(domain.proposalStillValid([{ ...accounts[0], saldo: units(600) }, accounts[1]], reserves, threshold, loan), false);
});

function environment(t, demo = false) {
  const values = {
    TREASURY_AUTOMATION_VAULT: vault,
    TREASURY_AUTOMATION_PRIVATE_KEY: `0x${'a'.repeat(64)}`,
    TREASURY_AUTOMATION_RESERVES: undefined,
    TREASURY_AUTOMATION_ALLOW_DEMO: demo ? 'true' : undefined,
  };
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}
function row(mode = 'normal', status = 'scheduled') {
  const signed = status === 'submitted' ? '0x1234' : null;
  return {
    id: runId, status, execute_at: new Date(0), result: null,
    tx_hash: signed ? fakeHash(signed) : null, signed_transaction: signed,
    decision: { scenario: 'surge', activity: domain.scenarios.surge, destinationBalance: units(50),
      threshold: threshold.toString(), thresholdSource: mode === 'demo' ? 'simulated' : 'ai', mode, loan: { ...loan }, explanation: 'Escenario sintético de prueba' },
  };
}
function harness(initial = null) {
  let current = initial ? structuredClone(initial) : null;
  const state = { accounts: structuredClone(accounts), due: true, signatures: 0, broadcasts: 0, inserts: 0, delay: null, settlementPending: true, confirmations: 0, sql: [] };
  class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const db = { async query(sql, params) {
    state.sql.push(sql);
    const compact = sql.replace(/\s+/g, ' ').trim();
    if (compact.startsWith('SELECT * FROM treasury_automation_runs')) return { rows: current && params[0] === vault && params[1] === current.id ? [structuredClone(current)] : [], rowCount: current ? 1 : 0 };
    if (compact.startsWith('SELECT id, decision, status')) return { rows: current ? [structuredClone(current)] : [] };
    if (compact.startsWith('SELECT 1 FROM treasury_automation_runs')) return { rows: [], rowCount: state.due && current?.status === 'scheduled' ? 1 : 0 };
    if (compact.startsWith('INSERT INTO treasury_automation_runs')) {
      state.inserts++;
      state.delay = params[4];
      current = { id: params[0], status: params[2], decision: params[3], execute_at: params[4] === null ? null : new Date(Date.now() + params[4] * 1000), result: params[5], tx_hash: null, signed_transaction: null };
      return { rows: [structuredClone(current)] };
    }
    if (compact.startsWith('WITH won AS')) {
      if (current.status === 'scheduled' && state.due) {
        current.status = 'submitted'; current.tx_hash = params[2]; current.signed_transaction = params[3];
      }
      return { rows: [], rowCount: 1 };
    }
    if (compact.includes("SET status = 'vetoed'")) {
      if (current.status !== 'scheduled' || state.due) return { rows: [] };
      current.status = 'vetoed'; current.result = 'El tesorero vetó la propuesta.';
      return { rows: [structuredClone(current)] };
    }
    if (compact.includes("SET status = 'skipped'")) { current.status = 'skipped'; return { rows: [] }; }
    if (compact.includes('SET status = $3')) { current.status = params[2]; current.result = params[3]; current.signed_transaction = null; return { rows: [] }; }
    throw new Error('Consulta no modelada en esta prueba: ' + compact);
  } };
  const service = loader({
    viem: { encodeFunctionData: () => '0xabcd', keccak256: fakeHash, parseUnits: (value) => BigInt(value) * UNIT },
    'viem/accounts': { privateKeyToAccount: () => ({ address: wallet, signTransaction: async () => { state.signatures++; return '0x1234'; } }) },
    'viem/chains': { avalancheFuji: { id: 43113 } },
    '../vault-abi': { vaultAbi: [] },
    './http': { ApiError },
    './fuji': {
      fuji: { getBalance: async () => UNIT, simulateContract: async () => ({}), prepareTransactionRequest: async request => request,
        sendRawTransaction: async () => { state.broadcasts++; return fakeHash('0x1234'); }, getTransaction: async () => null },
      readOperativas: async () => state.accounts, requireTreasurer: async () => {},
    },
    './intercompany-db': { database: () => db },
    './intercompany-service': {
      transferArgs: op => [BigInt(op.sourceId), BigInt(op.destinationId), BigInt(op.amount), 'FLX:' + op.id],
      confirmOperation: async () => { state.confirmations++; return { pending: state.settlementPending, operation: { status: 'confirmed' } }; },
    },
    './treasury-model': { predictThreshold: async () => ({ thresholdHundredths: 75, basis: 'both' }) },
  })('src/lib/server/treasury-automation-service.ts');
  return { service, state, current: () => current, access: { vault, wallet, token: vault, deployedAt: 0n } };
}
const status = code => error => error?.status === code;

test('Servidor: pitch requiere autorización explícita aunque el vault esté habilitado', async t => {
  environment(t);
  const { service, state, access } = harness();
  await assert.rejects(service.evaluateTreasury(access, 'demo', 'surge'), status(403));
  assert.equal(state.inserts, 0);
});
test('Servidor: habilitar pitch expresamente conserva la ventana de 5 segundos', async t => {
  environment(t, true);
  const { service, state, access } = harness();
  assert.equal((await service.evaluateTreasury(access, 'demo', 'surge')).status, 'scheduled');
  assert.equal(state.delay, 5);
  assert.equal(state.signatures, 0);
});
test('Servidor: modo normal conserva 180 segundos y no firma al evaluar', async t => {
  environment(t);
  const { service, state, access } = harness();
  assert.equal((await service.evaluateTreasury(access, 'normal', 'surge')).status, 'scheduled');
  assert.equal(state.delay, 180);
  assert.equal(state.signatures, 0);
});
test('Servidor: la política se aplica también cuando se invoca el servicio sin la ruta', async t => {
  environment(t);
  const { service, state, access } = harness();
  await assert.rejects(service.evaluateTreasury({ ...access, vault: `0x${'3'.repeat(40)}` }, 'normal', 'surge'), status(404));
  assert.equal(state.inserts, 0);
});
test('Servidor: reutiliza la propuesta activa en lugar de registrar otra', async t => {
  environment(t);
  const { service, state, access } = harness(row());
  assert.equal((await service.evaluateTreasury(access, 'normal', 'surge')).id, runId);
  assert.equal(state.inserts, 0);
});
test('Servidor: no firma ni emite antes del vencimiento', async t => {
  environment(t);
  const { service, state, access } = harness(row()); state.due = false;
  assert.equal((await service.advanceRun(access, runId)).status, 'scheduled');
  assert.equal(state.signatures, 0); assert.equal(state.broadcasts, 0);
});
test('Servidor: un veto dentro de la ventana impide la firma posterior', async t => {
  environment(t);
  const { service, state, access } = harness(row()); state.due = false;
  assert.equal((await service.vetoRun(vault, runId)).status, 'vetoed');
  state.due = true;
  assert.equal((await service.advanceRun(access, runId)).status, 'vetoed');
  assert.equal(state.signatures, 0); assert.equal(state.broadcasts, 0);
});
test('Servidor: no admite veto cuando finalizó el plazo', async t => {
  environment(t);
  const { service } = harness(row());
  await assert.rejects(service.vetoRun(vault, runId), status(409));
});
test('Servidor: deshabilitar pitch bloquea una propuesta previamente programada', async t => {
  environment(t);
  const { service, state, access } = harness(row('demo'));
  await assert.rejects(service.advanceRun(access, runId), status(403));
  assert.equal(state.signatures, 0); assert.equal(state.broadcasts, 0);
});
test('Servidor: no retransmite bytes preparados de pitch si se retiró su habilitación', async t => {
  environment(t);
  const { service, state, access } = harness(row('demo', 'submitted'));
  await assert.rejects(service.advanceRun(access, runId), status(403));
  assert.equal(state.broadcasts, 0);
});
test('Servidor: el bloqueo de pitch no impide conciliar una transacción ya confirmada', async t => {
  environment(t);
  const { service, state, access } = harness(row('demo', 'submitted')); state.settlementPending = false;
  assert.equal((await service.advanceRun(access, runId)).status, 'confirmed');
  assert.equal(state.broadcasts, 0);
});
test('Servidor: un hash distinto de los bytes persistidos impide la emisión', async t => {
  environment(t);
  const initial = row('normal', 'submitted'); initial.signed_transaction = '0xbeef';
  const { service, state, access } = harness(initial);
  await assert.rejects(service.advanceRun(access, runId), status(409));
  assert.equal(state.broadcasts, 0);
});
test('Servidor: el recorrido normal firma, emite y luego concilia sin volver a firmar', async t => {
  environment(t);
  const { service, state, access, current } = harness(row());
  assert.equal((await service.advanceRun(access, runId)).status, 'submitted');
  assert.equal(state.signatures, 1); assert.equal(state.broadcasts, 1);
  state.settlementPending = false;
  assert.equal((await service.advanceRun(access, runId)).status, 'confirmed');
  assert.equal(state.signatures, 1); assert.equal(state.broadcasts, 1);
  assert.equal(current().signed_transaction, null);
});
test('Servidor: saldos insuficientes en la revalidación descartan sin firmar', async t => {
  environment(t);
  const { service, state, access } = harness(row()); state.accounts[0].saldo = units(600);
  assert.equal((await service.advanceRun(access, runId)).status, 'skipped');
  assert.equal(state.signatures, 0); assert.equal(state.broadcasts, 0);
});
test('Servidor: alterar la tasa persistida no autoriza una firma fuera de política', async t => {
  environment(t);
  const initial = row(); initial.decision.loan.rateBps = 9999;
  const { service, state, access } = harness(initial);
  assert.equal((await service.advanceRun(access, runId)).status, 'skipped');
  assert.equal(state.signatures, 0); assert.equal(state.broadcasts, 0);
});
