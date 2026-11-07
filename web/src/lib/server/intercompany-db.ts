import { Pool } from "pg";
import type { ChainOperation, OperationStatus } from "../intercompany-api";
import type { IntercompanyTerms } from "../intercompany";

type OperationRow = {
  id: string;
  signer: string;
  source_id: number;
  destination_id: number;
  source_name: string;
  destination_name: string;
  amount: string;
  kind: IntercompanyTerms["kind"];
  rate_bps: number | null;
  note: string;
  status: OperationStatus;
  tx_hash: ChainOperation["txHash"];
  created_at: Date;
  confirmed_at: Date | null;
};

let pool: Pool | undefined;

export function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing");
  return pool ??= new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
}

function toOperation(row: OperationRow): ChainOperation {
  return {
    id: row.id, signer: row.signer, sourceId: row.source_id, destinationId: row.destination_id,
    sourceName: row.source_name, destinationName: row.destination_name, amount: row.amount,
    terms: row.rate_bps === null ? { kind: row.kind } : { kind: row.kind, rateBps: row.rate_bps },
    note: row.note, status: row.status, txHash: row.tx_hash,
    createdAt: row.created_at.toISOString(), confirmedAt: row.confirmed_at?.toISOString() ?? null,
  };
}

export async function listOperations(vault: string) {
  const result = await database().query<OperationRow>(
    "SELECT * FROM intercompany_operations WHERE vault_address = $1 ORDER BY created_at DESC, id DESC LIMIT 100",
    [vault],
  );
  return result.rows.map(toOperation);
}

export async function findOperation(vault: string, id: string) {
  const result = await database().query<OperationRow>(
    "SELECT * FROM intercompany_operations WHERE vault_address = $1 AND id = $2", [vault, id],
  );
  return result.rows[0] ? toOperation(result.rows[0]) : null;
}

type NewOperation = Omit<ChainOperation, "status" | "txHash" | "createdAt" | "confirmedAt">;

export async function insertOperation(vault: string, operation: NewOperation) {
  const result = await database().query<OperationRow>(
    `INSERT INTO intercompany_operations
      (id, vault_address, signer, source_id, destination_id, source_name, destination_name, amount, kind, rate_bps, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [operation.id, vault, operation.signer, operation.sourceId, operation.destinationId,
      operation.sourceName, operation.destinationName, operation.amount, operation.terms.kind,
      operation.terms.rateBps ?? null, operation.note],
  );
  return result.rows[0] ? toOperation(result.rows[0]) : null;
}

export async function attachTransaction(vault: string, id: string, hash: string) {
  const result = await database().query<OperationRow>(
    `UPDATE intercompany_operations SET status = 'submitted', tx_hash = $3
      WHERE vault_address = $1 AND id = $2 AND status = 'pending'
      RETURNING *`, [vault, id, hash],
  );
  return result.rows[0] ? toOperation(result.rows[0]) : await findOperation(vault, id);
}

export async function settleOperation(vault: string, id: string, hash: string, settlement: { block: bigint; time: Date } | null) {
  const result = await database().query<OperationRow>(
    `UPDATE intercompany_operations SET status = $4, block_number = $5, confirmed_at = $6
      WHERE vault_address = $1 AND id = $2 AND tx_hash = $3 AND status = 'submitted'
      RETURNING *`,
    [vault, id, hash, settlement ? "confirmed" : "reverted", settlement?.block.toString() ?? null, settlement?.time ?? null],
  );
  return result.rows[0] ? toOperation(result.rows[0]) : await findOperation(vault, id);
}

export async function consumeChallenge(nonce: string, expiresAt: number) {
  await database().query("DELETE FROM intercompany_used_challenges WHERE expires_at <= now()");
  const result = await database().query(
    "INSERT INTO intercompany_used_challenges (nonce, expires_at) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [nonce, new Date(expiresAt)],
  );
  return result.rowCount === 1;
}
