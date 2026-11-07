import { decodeEventLog, encodeFunctionData, TransactionNotFoundError, TransactionReceiptNotFoundError, type Hash } from "viem";
import { isIntercompanyTerms } from "../intercompany";
import { operationReference, transactionHashPattern, type ChainOperation } from "../intercompany-api";
import { parseArgt } from "../treasury-rail";
import { vaultAbi } from "../vault-abi";
import { fuji, readOperativas } from "./fuji";
import { ApiError } from "./http";
import { attachTransaction, findOperation, insertOperation, settleOperation } from "./intercompany-db";
import type { authorize } from "./wallet-session";

type Access = Awaited<ReturnType<typeof authorize>>;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function transferArgs(operation: Pick<ChainOperation, "id" | "sourceId" | "destinationId" | "amount">) {
  return [BigInt(operation.sourceId), BigInt(operation.destinationId), BigInt(operation.amount), operationReference(operation.id)] as const;
}

export async function prepareOperation(access: Access, body: Record<string, unknown>) {
  const { id, sourceId, destinationId, amount: formattedAmount, terms } = body;
  if (typeof id !== "string" || !uuidPattern.test(id) || typeof sourceId !== "number" ||
    typeof destinationId !== "number" || !Number.isSafeInteger(sourceId) || !Number.isSafeInteger(destinationId) ||
    sourceId < 0 || destinationId < 0 || sourceId > 2147483647 || destinationId > 2147483647 || sourceId === destinationId) {
    throw new ApiError(400, "Ingresá una referencia válida y elegí dos operativas distintas.");
  }
  if (typeof formattedAmount !== "string" || formattedAmount.length > 60 || !isIntercompanyTerms(terms) ||
      (body.note !== undefined && typeof body.note !== "string")) {
    throw new ApiError(400, "Revisá el capital, la tasa y la nota contable.");
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 120 || (terms.kind === "other" && !note)) {
    throw new ApiError(400, "Ingresá un detalle de hasta 120 caracteres para otros movimientos.");
  }
  let amount: string;
  try {
    amount = parseArgt(formattedAmount);
  } catch (error) {
    throw new ApiError(400, (error as Error).message);
  }
  const match = (existing: ChainOperation | null) => {
    if (!existing || existing.signer !== access.wallet || existing.sourceId !== sourceId ||
        existing.destinationId !== destinationId || existing.amount !== amount || existing.note !== note ||
        existing.terms.kind !== terms.kind || existing.terms.rateBps !== terms.rateBps) {
      throw new ApiError(409, "La referencia ya pertenece a otra operación.");
    }
    return existing;
  };
  const existing = await findOperation(access.vault, id);
  if (existing) return match(existing);
  const operativas = await readOperativas(access);
  const source = operativas.find(op => op.id === sourceId);
  const destination = operativas.find(op => op.id === destinationId);
  if (!source || !destination) throw new ApiError(400, "Elegí operativas activas del vault.");
  if (BigInt(source.saldo) < BigInt(amount)) throw new ApiError(422, "El saldo de origen es insuficiente.");
  const operation = {
    id, signer: access.wallet, sourceId, destinationId, sourceName: source.nombre,
    destinationName: destination.nombre, amount, terms, note,
  };
  await fuji.simulateContract({
    account: access.wallet, address: access.vault, abi: vaultAbi, functionName: "transferirInterno",
    args: transferArgs(operation),
  });
  return await insertOperation(access.vault, operation) ?? match(await findOperation(access.vault, id));
}

export async function confirmOperation(access: Access, id: string, rawHash: unknown) {
  if (!uuidPattern.test(id) || typeof rawHash !== "string" || !transactionHashPattern.test(rawHash)) {
    throw new ApiError(400, "Ingresá una referencia y un hash de Fuji válidos.");
  }
  const hash = rawHash.toLowerCase() as Hash;
  let operation = await findOperation(access.vault, id);
  if (!operation) throw new ApiError(404, "No se encontró esa operación.");
  if (operation.txHash && operation.txHash !== hash) throw new ApiError(409, "La operación ya tiene otro hash asociado.");
  if (operation.status === "confirmed" || operation.status === "reverted") return { operation, pending: false };

  if (!operation.txHash) {
    const tx = await fuji.getTransaction({ hash }).catch(error => {
      if (error instanceof TransactionNotFoundError) return null;
      throw error;
    });
    if (!tx) return { operation, pending: true };
    const calldata = encodeFunctionData({ abi: vaultAbi, functionName: "transferirInterno", args: transferArgs(operation) });
    if (tx.hash.toLowerCase() !== hash || tx.from.toLowerCase() !== operation.signer || tx.to?.toLowerCase() !== access.vault ||
        tx.input.toLowerCase() !== calldata.toLowerCase() || tx.value !== BigInt(0)) {
      throw new ApiError(422, "La transacción no coincide con la wallet, el vault o los datos de la operación.");
    }
    try {
      operation = await attachTransaction(access.vault, id, hash);
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        throw new ApiError(409, "El hash ya está asociado a otra operación.");
      }
      throw error;
    }
    if (!operation || operation.txHash !== hash) throw new ApiError(409, "La operación ya tiene otro hash asociado.");
  }

  const receipt = await fuji.getTransactionReceipt({ hash }).catch(error => {
    if (error instanceof TransactionReceiptNotFoundError) return null;
    throw error;
  });
  if (!receipt) return { operation, pending: true };
  if (receipt.transactionHash.toLowerCase() !== hash || receipt.from.toLowerCase() !== operation.signer ||
      receipt.to?.toLowerCase() !== access.vault) {
    throw new ApiError(422, "El recibo no corresponde a la transacción registrada.");
  }
  if (receipt.blockNumber < access.deployedAt) throw new ApiError(422, "El recibo es anterior al despliegue del vault.");
  if (receipt.status === "reverted") {
    return { operation: await settleOperation(access.vault, id, hash, null), pending: false };
  }

  const [sourceId, destinationId, amount, reference] = transferArgs(operation);
  const matches = receipt.logs.filter(log => {
    if (log.removed || log.address.toLowerCase() !== access.vault) return false;
    try {
      const { args } = decodeEventLog({ abi: vaultAbi, eventName: "TransferenciaInterna", data: log.data, topics: log.topics });
      return args.desde === sourceId && args.hacia === destinationId && args.monto === amount && args.concepto === reference;
    } catch {
      return false;
    }
  });
  if (matches.length !== 1) throw new ApiError(422, "El recibo no contiene un evento que identifique de forma única este movimiento.");
  const block = await fuji.getBlock({ blockHash: receipt.blockHash, includeTransactions: false });
  const settled = await settleOperation(access.vault, id, hash, {
    block: receipt.blockNumber, time: new Date(Number(block.timestamp) * 1000),
  });
  return { operation: settled, pending: false };
}
