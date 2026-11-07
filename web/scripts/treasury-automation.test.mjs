import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED_THRESHOLD, loanCandidate, proposalStillValid } from '../src/lib/treasury-automation.ts';
import { parseArgt } from '../src/lib/treasury-rail.ts';
import { predictThreshold } from '../src/lib/server/treasury-model.ts';
import { scenarios } from '../src/lib/treasury-automation.ts';

const central = { id: 0, nombre: 'Caja central', saldo: parseArgt('9,5') };
const palermo = { id: 1, nombre: 'Local Palermo', saldo: parseArgt('0,5') };
const reserves = new Map([[0, BigInt(parseArgt('5'))]]);
const preventive = BigInt(parseArgt('0,75'));

test('the pitch balance needs a preventive threshold to trigger the 1.5 mARGt loan', () => {
  assert.equal(loanCandidate([central, palermo], reserves, FIXED_THRESHOLD), null);
  assert.deepEqual(loanCandidate([central, palermo], reserves, preventive), {
    sourceId: 0, sourceName: 'Caja central', destinationId: 1, destinationName: 'Local Palermo',
    amount: parseArgt('1,5'), rateBps: 500,
  });
  const empty = { ...palermo, saldo: '0' };
  assert.equal(loanCandidate([central, empty], reserves, FIXED_THRESHOLD).amount, parseArgt('2'));
});

test('fallback funding uses the greatest eligible surplus and preserves the reserve', () => {
  const accounts = [
    { ...central, saldo: parseArgt('6') }, palermo,
    { id: 2, nombre: 'Otra operativa', saldo: parseArgt('5') },
    { id: 3, nombre: 'Mayor excedente', saldo: parseArgt('8') },
    { id: 4, nombre: 'Sin habilitación', saldo: parseArgt('100') },
  ];
  const configured = new Map([...reserves, [2, BigInt(parseArgt('3'))], [3, BigInt(parseArgt('4'))]]);
  assert.equal(loanCandidate(accounts, configured, preventive).sourceId, 3);
  assert.equal(loanCandidate(accounts, reserves, preventive), null);
  assert.equal(loanCandidate([central, ...accounts.slice(1)], configured, preventive).sourceId, 0);
});

test('revalidation rejects recovered balances, overshooting the target, and depleted reserves', () => {
  const loan = loanCandidate([central, palermo], reserves, preventive);
  assert.ok(proposalStillValid([central, palermo], reserves, preventive, loan));
  assert.ok(!proposalStillValid([central, { ...palermo, saldo: parseArgt('0,75') }], reserves, preventive, loan));
  assert.ok(!proposalStillValid([central, { ...palermo, saldo: parseArgt('0,6') }], reserves, preventive, loan));
  assert.ok(!proposalStillValid([{ ...central, saldo: parseArgt('6,4') }, palermo], reserves, preventive, loan));
});

test('preventive thresholds reject out-of-policy values and fall back when the model is unavailable', async (t) => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test';
  t.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });
  let answer = { thresholdHundredths: 75, basis: 'both' };
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({
    output: [{ content: [{ type: 'output_text', text: JSON.stringify(answer) }] }],
  }));
  assert.deepEqual(await predictThreshold(scenarios.surge, palermo.saldo), answer);
  assert.equal(await predictThreshold(scenarios.normal, palermo.saldo), null);
  answer = { ...answer, thresholdHundredths: 101 };
  assert.equal(await predictThreshold(scenarios.surge, palermo.saldo), null);
  mock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  assert.equal(await predictThreshold(scenarios.surge, palermo.saldo), null);
});

test('pitch mode produces the demo threshold without calling the model', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network call'); });
  assert.deepEqual(await predictThreshold(scenarios.surge, palermo.saldo, 'demo'), { thresholdHundredths: 75, basis: 'both' });
  assert.equal(await predictThreshold(scenarios.normal, palermo.saldo, 'demo'), null);
  assert.equal(request.mock.callCount(), 0);
});
