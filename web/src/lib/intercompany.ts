export const intercompanyLabels = { loan: "Préstamo", contribution: "Aporte", other: "Otro" } as const;
export type IntercompanyTerms = { kind: keyof typeof intercompanyLabels; rateBps?: number };

export function parseRateBps(value: string): number {
  const raw = value.trim();
  if (!/^\d{1,3}(?:[,.]\d{1,2})?$/.test(raw)) throw new Error("Ingresá una tasa entre 0 y 100%, con hasta dos decimales.");
  const [whole, fraction = ""] = raw.split(/[,.]/);
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (bps > 10000) throw new Error("Ingresá una tasa entre 0 y 100%.");
  return bps;
}

export function isIntercompanyTerms(value: unknown): value is IntercompanyTerms {
  if (!value || typeof value !== "object") return false;
  const { kind, rateBps } = value as IntercompanyTerms;
  return kind === "loan"
    ? typeof rateBps === "number" && Number.isInteger(rateBps) && rateBps >= 0 && rateBps <= 10000
    : (kind === "contribution" || kind === "other") && rateBps === undefined;
}

export function formatRate(bps: number) {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(bps / 100)}% TNA`;
}

export function snowtraceTransaction(hash: string | undefined, explorerUrl: string) {
  return hash && /^0x[0-9a-fA-F]{64}$/.test(hash) && !/^0x0{64}$/i.test(hash)
    ? `${explorerUrl}/tx/${hash}`
    : null;
}
