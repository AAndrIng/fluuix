import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRate, parseRateBps, snowtraceTransaction } from '../src/lib/intercompany.ts';
import { applyRailAction, createInitialRailState, dateArgentina, estimatedTax, formatArgt, parseArgt, parseRecipientsCsv, totalBalance } from '../src/lib/treasury-rail.ts';
const units = parseArgt;
const apply = (state, action) => applyRailAction(state, action, '2026-11-07T15:00:00.000Z').state;
const recipients = [1, 2, 3].map(n => ({ nombre: `Empleado ${n}`, wallet: `0x${String(n).repeat(40)}`, monto: units('600.000') }));

test('rebalance redistributes in contract order and preserves group liquidity', () => {
  const initial = createInitialRailState();
  const next = apply(initial, { type: 'rebalance' });
  assert.deepEqual(next.operativas.map(o => formatArgt(o.saldo)), ['4.000.000', '3.000.000', '2.000.000', '1.000.000']);
  assert.equal(totalBalance(next), totalBalance(initial));
  assert.equal(next.totalMovidoInterno, units('6.000.000'));
  assert.equal(estimatedTax(next.totalMovidoInterno), units('72.000'));
  assert.equal(initial.operativas[1].saldo, '0');
});
test('end-to-end transfer and payroll replenish only after payout', () => {
  let state = apply(createInitialRailState(), { type: 'rebalance' });
  state = apply(state, { type: 'transfer', from: 1, to: 3, amount: units('500.000'), concept: 'Préstamo intercompany' });
  assert.equal(state.operativas[1].saldo, units('2.500.000'));
  assert.equal(totalBalance(state), units('10.000.000'));
  state = apply(state, { type: 'batch', from: 1, recipients, concept: 'Sueldos noviembre' });
  assert.equal(state.operativas[1].saldo, units('3.000.000'));
  assert.equal(state.operativas[0].saldo, units('1.700.000'));
  assert.equal(totalBalance(state), units('8.200.000'));
  assert.equal(state.totalPagado, units('1.800.000'));
  assert.equal(state.totalMovidoInterno, units('8.800.000'));
  assert.equal(estimatedTax(state.totalMovidoInterno), units('105.600'));
  assert.equal(state.events[0].tipo, 'Rebalanceo');
  assert.equal(state.events[1].tipo, 'Pago en lote');
});
test('partial replenishment exhausts central funds without creating money', () => {
  const initial = createInitialRailState();
  initial.operativas[0].saldo = units('250.000');
  const next = apply(initial, { type: 'rebalance' });
  assert.deepEqual(next.operativas.map(o => formatArgt(o.saldo)), ['0', '250.000', '0', '0']);
  assert.equal(totalBalance(next), units('250.000'));
});
test('an operative exactly at its minimum is not replenished', () => {
  const state = createInitialRailState();
  state.operativas[1].saldo = state.operativas[1].minimo;
  const next = apply(state, { type: 'rebalance', id: 1 });
  assert.equal(next.totalMovidoInterno, '0');
  assert.equal(next.operativas[1].saldo, units('1.000.000'));
});
test('internal transfer does not trigger automatic replenishment', () => {
  let state = apply(createInitialRailState(), { type: 'rebalance' });
  state = apply(state, { type: 'transfer', from: 1, to: 2, amount: units('2.500.000'), concept: 'Intercompany' });
  assert.equal(state.operativas[1].saldo, units('500.000'));
  assert.equal(state.operativas[0].saldo, units('4.000.000'));
});
test('insufficient funds and invalid recipients revert the entire simulated action', () => {
  const state = createInitialRailState();
  const before = JSON.stringify(state);
  assert.throws(() => apply(state, { type: 'batch', from: 1, recipients, concept: 'Sueldos' }), /Saldo insuficiente/);
  assert.throws(() => apply(state, { type: 'batch', from: 0, recipients: [{ ...recipients[0], wallet: `0x${'0'.repeat(40)}` }], concept: 'Sueldos' }), /wallet/);
  assert.throws(() => apply(state, { type: 'transfer', from: 0, to: 0, amount: units('1'), concept: 'Test' }), /distintas/);
  assert.equal(JSON.stringify(state), before);
});
test('deposits change group funds and wallet, but not internal volume or paid total', () => {
  const state = apply(createInitialRailState(), { type: 'deposit', id: 0, amount: units('10.000.000') });
  assert.equal(totalBalance(state), units('20.000.000'));
  assert.equal(state.walletBalance, '0');
  assert.equal(state.totalMovidoInterno, '0');
  assert.equal(state.totalPagado, '0');
});
test('money parsing preserves 18 decimals and rejects ambiguous input', () => {
  assert.equal(units('1,000000000000000001'), '1000000000000000001');
  assert.equal(units('1.250.000,50'), '1250000500000000000000000');
  assert.equal(formatArgt(units('1.250.000,50')), '1.250.000,5');
  assert.throws(() => units('1.5'), /formato argentino/);
  assert.throws(() => units('-10'));
  assert.throws(() => units('0'));
  assert.equal(parseArgt('0', true), '0');
});
test('CSV import handles quoted commas and rejects invalid columns and oversized batches', () => {
  const wallet = recipients[0].wallet;
  const parsed = parseRecipientsCsv(`nombre,wallet,monto\r\n"Apellido, Nombre",${wallet},"1.000,50"`);
  assert.equal(parsed[0].nombre, 'Apellido, Nombre');
  assert.equal(parsed[0].monto, units('1.000,50'));
  assert.throws(() => parseRecipientsCsv(`nombre,wallet,monto\nTest,${wallet},1000,50`), /3 columnas/);
  assert.throws(() => parseRecipientsCsv(`nombre,wallet,monto\n${Array(101).fill(`Test,${wallet},1`).join('\n')}`), /100 destinatarios/);
});
test('thresholds cannot mutate central rules and must have target >= minimum', () => {
  const state = createInitialRailState();
  assert.throws(() => apply(state, { type: 'thresholds', id: 0, minimum: '0', target: '0' }), /central/);
  assert.throws(() => apply(state, { type: 'create', name: 'Nueva', minimum: units('2'), target: units('1') }), /objetivo/);
});
test('dates render deterministically in Argentina', () => {
  assert.equal(dateArgentina('2026-11-07T13:00:00.000Z'), '07/11/2026 · 10:00');
});

test('intercompany loan terms persist without changing the principal or accruing interest', () => {
  const initial = createInitialRailState();
  const terms = { kind: 'loan', rateBps: parseRateBps('12,50') };
  const next = apply(initial, { type: 'transfer', from: 0, to: 1, amount: units('100.000'), concept: 'Préstamo intercompany', intercompany: terms });
  assert.deepEqual(next.events[0].intercompany, terms);
  assert.equal(formatRate(terms.rateBps), '12,5% TNA');
  assert.equal(next.operativas[1].saldo, units('100.000'));
  assert.equal(totalBalance(next), totalBalance(initial));
  assert.equal(snowtraceTransaction(next.events[0].txHash, 'https://testnet.snowtrace.io'), null);
  assert.throws(() => apply(initial, { type: 'transfer', from: 0, to: 1, amount: units('1'), concept: 'Aporte', intercompany: { kind: 'contribution', rateBps: 500 } }), /tipo de operación/);
  assert.throws(() => parseRateBps('100,01'), /100%/);
});
