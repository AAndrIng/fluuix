import { randomUUID } from "node:crypto";
import { encodeFunctionData, keccak256, parseUnits, type Address, type Hex, type TransactionSerialized } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { FIXED_THRESHOLD, PALERMO_ID, loanCandidate, proposalStillValid, scenarios, type ActivityScenario, type AutomationDecision, type AutomationMode, type AutomationRun } from "../treasury-automation";
import { UNIT, formatArgt } from "../treasury-rail";
import { vaultAbi } from "../vault-abi";
import { fuji, readOperativas, requireTreasurer } from "./fuji";
import { ApiError } from "./http";
import { database } from "./intercompany-db";
import { confirmOperation, transferArgs } from "./intercompany-service";
import { predictThreshold } from "./treasury-model";
import type { authorize } from "./wallet-session";

type Access = Awaited<ReturnType<typeof authorize>>;
type RunRow = { id: string; decision: AutomationDecision; status: AutomationRun["status"]; execute_at: Date | null; result: string | null; tx_hash: Hex | null; signed_transaction: TransactionSerialized | null };

export function automationEnabled(vault: string) {
  return Boolean(vault) && process.env.TREASURY_AUTOMATION_VAULT?.trim().toLowerCase() === vault.toLowerCase();
}

function signer() {
  const key = process.env.TREASURY_AUTOMATION_PRIVATE_KEY?.trim();
  if (!key || !/^0x[\da-fA-F]{64}$/.test(key)) throw new ApiError(503, "Configurá la clave de la wallet automática de Fuji.");
  return privateKeyToAccount(key as Hex);
}

function fundingReserves() {
  const reserves = new Map([[0, BigInt(5) * UNIT]]);
  const raw = process.env.TREASURY_AUTOMATION_RESERVES;
  if (!raw) return reserves;
  try {
    const extra: unknown = JSON.parse(raw);
    if (!extra || typeof extra !== "object" || Array.isArray(extra)) throw new Error();
    for (const [id, amount] of Object.entries(extra)) {
      if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 2 || typeof amount !== "string" || !/^\d+(\.\d{1,18})?$/.test(amount)) throw new Error();
      reserves.set(Number(id), parseUnits(amount, 18));
    }
  } catch {
    throw new ApiError(503, "Revisá las reservas de las operativas habilitadas para prestar.");
  }
  return reserves;
}

function toRun(row: RunRow): AutomationRun {
  return { ...row.decision, id: row.id, status: row.status, executeAt: row.execute_at?.toISOString() ?? null, result: row.result, txHash: row.tx_hash };
}

async function findRun(vault: Address, id: string) {
  const { rows } = await database().query<RunRow>("SELECT * FROM treasury_automation_runs WHERE vault_address = $1 AND id = $2", [vault, id]);
  if (!rows[0]) throw new ApiError(404, "No se encontró esta evaluación de tesorería.");
  return rows[0];
}

export async function listRuns(vault: Address) {
  const { rows } = await database().query<RunRow>(`SELECT id, decision, status, execute_at, result, tx_hash FROM treasury_automation_runs
    WHERE vault_address = $1 ORDER BY (status IN ('scheduled', 'submitted')) DESC, created_at DESC LIMIT 8`, [vault]);
  return rows.map(toRun);
}

export async function evaluateTreasury(access: Access, mode: AutomationMode, scenario: ActivityScenario) {
  const active = (await listRuns(access.vault)).find(run => run.status === "scheduled" || run.status === "submitted");
  if (active) return active;

  const accounts = await readOperativas(access);
  const destination = accounts.find(account => account.id === PALERMO_ID);
  if (!destination) throw new ApiError(422, "Falta la operativa activa de Palermo (ID 1) en el vault.");
  const balance = BigInt(destination.saldo);
  const activity = scenarios[scenario];
  const surge = activity.traffic > activity.usualTraffic || activity.sales > activity.usualSales;
  const canPredict = surge && balance >= FIXED_THRESHOLD && balance < UNIT;
  const prediction = canPredict ? await predictThreshold(activity, destination.saldo, mode) : null;
  const thresholdSource = prediction ? (mode === "demo" ? "simulated" : "ai") : "fixed";
  const threshold = prediction ? BigInt(prediction.thresholdHundredths) * UNIT / BigInt(100) : FIXED_THRESHOLD;
  const loan = loanCandidate(accounts, fundingReserves(), threshold);
  const shownBalance = formatArgt(destination.saldo, 18);
  const shownThreshold = formatArgt(threshold.toString(), 18);
  const evidence = prediction?.basis === "both" ? "el tráfico y las ventas" : prediction?.basis === "sales" ? "las ventas" : "el tráfico";
  const explanation = prediction
    ? `Por la suba en ${evidence}, ${mode === "demo" ? "el escenario simula" : "el agente propone"} un umbral preventivo de ${shownThreshold} mARGt. Palermo tiene ${shownBalance} mARGt.`
    : `Palermo tiene ${shownBalance} mARGt frente al mínimo fijo de 0,25 mARGt.${mode === "normal" && canPredict ? " La evaluación preventiva de IA no estuvo disponible." : ""}`;
  const decision: AutomationDecision = {
    scenario, activity, destinationBalance: destination.saldo, threshold: threshold.toString(), thresholdSource, mode, loan,
    explanation: loan ? `${explanation} ${loan.sourceName} puede prestar ${formatArgt(loan.amount, 18)} mARGt y conservar su reserva.` : explanation,
  };
  if (loan) {
    const account = signer();
    const [gasBalance] = await Promise.all([fuji.getBalance({ address: account.address }), requireTreasurer(access.vault, account.address)]);
    if (gasBalance === BigInt(0)) throw new ApiError(503, "La wallet automática necesita AVAX de prueba para el gas.");
  }
  const result = loan ? null : balance >= threshold ? "El saldo alcanza el umbral aplicable." : "Las operativas habilitadas necesitan conservar sus reservas.";
  const { rows } = await database().query<RunRow>(`INSERT INTO treasury_automation_runs (id, vault_address, status, decision, execute_at, result)
    VALUES ($1, $2, $3, $4, CASE WHEN $5::integer IS NOT NULL THEN now() + $5 * interval '1 second' END, $6)
    ON CONFLICT DO NOTHING RETURNING *`,
  [randomUUID(), access.vault, loan ? "scheduled" : "skipped", decision, loan ? (mode === "demo" ? 5 : 180) : null, result]);
  if (rows[0]) return toRun(rows[0]);
  const [latest] = await listRuns(access.vault);
  if (!latest) throw new ApiError(409, "La evaluación cambió. Volvé a consultar el estado.");
  return latest;
}

export async function vetoRun(vault: Address, id: string) {
  const { rows } = await database().query<RunRow>(`UPDATE treasury_automation_runs SET status = 'vetoed', result = 'El tesorero vetó la propuesta.'
    WHERE vault_address = $1 AND id = $2 AND status = 'scheduled' AND execute_at > now() RETURNING *`, [vault, id]);
  if (rows[0]) return toRun(rows[0]);
  const run = await findRun(vault, id);
  if (run.status === "vetoed") return toRun(run);
  throw new ApiError(409, "El plazo para vetar esta propuesta ya terminó.");
}

async function prepareSignedRun(access: Access, run: RunRow) {
  const { vault } = access;
  const { id, decision: { loan, threshold } } = run;
  if (!loan) throw new Error("Scheduled run has no loan");
  const accounts = await readOperativas(access);
  if (!proposalStillValid(accounts, fundingReserves(), BigInt(threshold), loan)) {
    await database().query(`UPDATE treasury_automation_runs SET status = 'skipped', result = 'Los saldos cambiaron y la propuesta dejó de cumplir la política.'
      WHERE vault_address = $1 AND id = $2 AND status = 'scheduled' AND execute_at <= now()`, [vault, id]);
    return findRun(vault, id);
  }

  const account = signer();
  const args = transferArgs({ ...loan, id });
  await fuji.simulateContract({ account: account.address, address: vault, abi: vaultAbi, functionName: "transferirInterno", args });
  const request = await fuji.prepareTransactionRequest({ account, chain: avalancheFuji, type: "eip1559", to: vault,
    data: encodeFunctionData({ abi: vaultAbi, functionName: "transferirInterno", args }) });
  const serialized = await account.signTransaction(request);
  const hash = keccak256(serialized);

  // Only the transaction that wins this update can be broadcast. The ledger row commits with it.
  await database().query(`WITH won AS (
    UPDATE treasury_automation_runs SET status = 'submitted', tx_hash = $3, signed_transaction = $4
    WHERE vault_address = $1 AND id = $2 AND status = 'scheduled' AND execute_at <= now()
    RETURNING id, vault_address, tx_hash
  ) INSERT INTO intercompany_operations
    (id, vault_address, signer, source_id, destination_id, source_name, destination_name, amount, kind, rate_bps, note, status, tx_hash)
    SELECT id, vault_address, $5, $6, $7, $8, $9, $10, 'loan', $11, 'Préstamo automático del agente de tesorería', 'submitted', tx_hash FROM won`,
  [vault, id, hash, serialized, account.address.toLowerCase(), loan.sourceId, loan.destinationId, loan.sourceName, loan.destinationName, loan.amount, loan.rateBps]);
  return findRun(vault, id);
}

export async function advanceRun(access: Access, id: string) {
  const { vault } = access;
  let run = await findRun(vault, id);
  if (run.status === "scheduled") {
    const due = await database().query("SELECT 1 FROM treasury_automation_runs WHERE id = $1 AND status = 'scheduled' AND execute_at <= now()", [id]);
    if (!due.rowCount) return toRun(await findRun(vault, id));
    run = await prepareSignedRun(access, run);
  }
  if (run.status !== "submitted" || !run.tx_hash || !run.signed_transaction) return toRun(run);

  const settlement = await confirmOperation(access, id, run.tx_hash);
  if (settlement.pending) {
    const hash = run.tx_hash;
    try {
      await fuji.sendRawTransaction({ serializedTransaction: run.signed_transaction });
    } catch (error) {
      // A second tab or an earlier RPC attempt may already have sent these same bytes.
      if (!await fuji.getTransaction({ hash }).catch(() => null)) throw error;
    }
    return toRun(run);
  }

  const confirmed = settlement.operation?.status === "confirmed";
  const result = confirmed ? "Préstamo registrado y conciliado en Avalanche Fuji." : "Fuji revirtió la transacción.";
  await database().query(`UPDATE treasury_automation_runs SET status = $3, result = $4, signed_transaction = NULL
    WHERE vault_address = $1 AND id = $2 AND status = 'submitted'`, [vault, id, confirmed ? "confirmed" : "reverted", result]);
  return toRun(await findRun(vault, id));
}
