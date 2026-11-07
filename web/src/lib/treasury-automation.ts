import { UNIT } from "./treasury-rail.ts";

export type ActivityScenario = "surge" | "normal";
export type AutomationMode = "demo" | "normal";
export type CashAccount = { id: number; nombre: string; saldo: string };
export type Activity = { traffic: number; usualTraffic: number; sales: number; usualSales: number };
export type LoanProposal = { sourceId: number; sourceName: string; destinationId: number; destinationName: string; amount: string; rateBps: number };
export type AutomationDecision = {
  scenario: ActivityScenario;
  activity: Activity;
  destinationBalance: string;
  threshold: string;
  thresholdSource: "fixed" | "ai" | "simulated";
  explanation: string;
  loan: LoanProposal | null;
  mode: AutomationMode;
};
export type AutomationRun = AutomationDecision & {
  id: string;
  status: "scheduled" | "vetoed" | "skipped" | "submitted" | "confirmed" | "reverted";
  executeAt: string | null;
  result: string | null;
  txHash: `0x${string}` | null;
};

export const PALERMO_ID = 1;
export const FIXED_THRESHOLD = UNIT / BigInt(4);
const targetBalance = BigInt(2) * UNIT;
const loanCap = BigInt(2) * UNIT;
const rateBps = 500;

export const scenarios: Record<ActivityScenario, Activity> = {
  surge: { traffic: 140, usualTraffic: 100, sales: 130, usualSales: 100 },
  normal: { traffic: 100, usualTraffic: 100, sales: 100, usualSales: 100 },
};

export function loanCandidate(accounts: CashAccount[], reserves: ReadonlyMap<number, bigint>, threshold: bigint) {
  const destination = accounts.find(account => account.id === PALERMO_ID);
  if (!destination || BigInt(destination.saldo) >= threshold) return null;
  const missing = targetBalance - BigInt(destination.saldo);
  const amount = missing < loanCap ? missing : loanCap;
  const eligible = accounts.flatMap(account => {
    const reserve = reserves.get(account.id);
    if (account.id === PALERMO_ID || reserve === undefined) return [];
    const available = BigInt(account.saldo) - reserve;
    return available >= amount ? [{ account, available }] : [];
  });
  const funding = eligible.find(({ account }) => account.id === 0) ?? eligible.reduce<(typeof eligible)[number] | undefined>(
    (best, candidate) => !best || candidate.available > best.available ? candidate : best, undefined,
  );
  if (!funding) return null;
  return {
    sourceId: funding.account.id, sourceName: funding.account.nombre,
    destinationId: destination.id, destinationName: destination.nombre,
    amount: amount.toString(), rateBps,
  } satisfies LoanProposal;
}

export function proposalStillValid(accounts: CashAccount[], reserves: ReadonlyMap<number, bigint>, threshold: bigint, loan: LoanProposal) {
  const destination = accounts.find(account => account.id === loan.destinationId);
  const source = accounts.find(account => account.id === loan.sourceId);
  const reserve = reserves.get(loan.sourceId);
  const amount = BigInt(loan.amount);
  return destination && source && reserve !== undefined && BigInt(destination.saldo) < threshold &&
    BigInt(destination.saldo) + amount <= targetBalance && BigInt(source.saldo) - amount >= reserve;
}
