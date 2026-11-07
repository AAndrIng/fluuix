import type { IntercompanyTerms } from "./intercompany";

export type OperationStatus = "pending" | "submitted" | "confirmed" | "reverted";

export type ChainOperation = {
  id: string;
  signer: string;
  sourceId: number;
  destinationId: number;
  sourceName: string;
  destinationName: string;
  amount: string;
  terms: IntercompanyTerms;
  note: string;
  status: OperationStatus;
  txHash: `0x${string}` | null;
  createdAt: string;
  confirmedAt: string | null;
};

export type ChainSnapshot = {
  wallet: `0x${string}`;
  vault: `0x${string}`;
  operativas: { id: number; nombre: string; saldo: string }[];
  operations: ChainOperation[];
};

export const operationReference = (id: string) => `FLX:${id}`;
export const transactionHashPattern = /^0x[0-9a-fA-F]{64}$/;
