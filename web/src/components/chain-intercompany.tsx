"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDownUp, ArrowUpRight, Building2, CircleHelp, Wallet } from "lucide-react";
import { createWalletClient, custom, type EIP1193Provider, type Hash } from "viem";
import { avalancheFuji } from "viem/chains";
import { operationReference, transactionHashPattern, type ChainOperation, type ChainSnapshot } from "@/lib/intercompany-api";
import { formatRate, intercompanyLabels, parseRateBps, snowtraceTransaction, type IntercompanyTerms } from "@/lib/intercompany";
import { treasuryConfig } from "@/lib/config";
import { dateArgentina, formatArgt, parseArgt } from "@/lib/treasury-rail";
import { vaultAbi } from "@/lib/vault-abi";
import { PALERMO_ID } from "@/lib/treasury-automation";
import TreasuryAutomationPanel from "./treasury-automation-panel";

const apiRoot = "/api/intercompany";
const statusNames = { pending: "Por firmar / sin hash", submitted: "Enviada", confirmed: "Confirmada", reverted: "Revertida" };

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function api<T>(path = "", body?: object): Promise<T> {
  const response = await fetch(apiRoot + path, {
    cache: "no-store",
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new RequestError(response.status, data.error ?? "No se pudo completar la solicitud.");
  return data;
}

function getWallet() {
  const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error("Abrí la app en un navegador con una wallet compatible con Avalanche.");
  return createWalletClient({ chain: avalancheFuji, transport: custom(provider, { retryCount: 0 }) });
}

function storedHash(vault: string, id: string, hash?: Hash | null) {
  const key = `fluuix-fuji:${vault}:${id}`;
  try {
    if (hash === null) sessionStorage.removeItem(key);
    else if (hash) sessionStorage.setItem(key, hash);
    return sessionStorage.getItem(key) ?? "";
  } catch { return ""; }
}

function Register({ operations, tokenLabel }: { operations: ChainOperation[]; tokenLabel: string }) {
  return <section className="payments-panel intercompany-panel">
    <div className="payments-heading"><div><h2>Registro intercompany</h2><p>Movimientos preparados y conciliados con el vault de Fuji.</p></div></div>
    <div className="table-scroll">{operations.length ? <table>
      <thead><tr><th>ORIGEN</th><th>DESTINO</th><th>TIPO</th><th>CAPITAL</th><th>INTERÉS</th><th>FECHA · ARGENTINA</th><th>ESTADO</th><th>SNOWTRACE</th></tr></thead>
      <tbody>{operations.map(operation => {
        const url = operation.status === "confirmed" && operation.txHash
          ? snowtraceTransaction(operation.txHash, treasuryConfig.explorerUrl) : null;
        return <tr key={operation.id}><td>{operation.sourceName}</td><td>{operation.destinationName}</td>
          <td title={operation.note}>{intercompanyLabels[operation.terms.kind]}</td><td>{formatArgt(operation.amount, 18)} {tokenLabel}</td>
          <td>{operation.terms.rateBps !== undefined ? formatRate(operation.terms.rateBps) : "—"}</td>
          <td>{dateArgentina(operation.confirmedAt ?? operation.createdAt)}</td><td>{statusNames[operation.status]}</td>
          <td>{url ? <a className="row-link" href={url} target="_blank" rel="noreferrer">Ver transacción <ArrowUpRight size={12}/></a> : "—"}</td>
        </tr>;
      })}</tbody>
    </table> : <div className="empty-state"><h3>El primer movimiento aparecerá acá.</h3></div>}</div>
  </section>;
}

export default function ChainIntercompany({ view, automation = false }: { view: "dashboard" | "mover"; automation?: boolean }) {
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<IntercompanyTerms["kind"]>("loan");
  const [recoveryId, setRecoveryId] = useState("");
  const [recoveryHash, setRecoveryHash] = useState("");
  const lock = useRef(false);
  const refreshSnapshot = useCallback(async () => {
    try {
      setSnapshot(await api<ChainSnapshot>());
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) setSnapshot(null);
      setError(error instanceof Error ? error.message : "No se pudieron actualizar los saldos.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    api<ChainSnapshot>().then(data => {
      if (active) setSnapshot(data);
    }).catch(error => {
      if (active && (!(error instanceof RequestError) || error.status !== 401)) setError(error.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) setSnapshot(null);
      setError(error instanceof Error ? error.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  async function connect() {
    const walletClient = getWallet();
    const [wallet] = await walletClient.requestAddresses();
    if (!wallet) throw new Error("Seleccioná una cuenta en tu wallet.");
    if (await walletClient.getChainId() !== avalancheFuji.id) {
      await walletClient.switchChain({ id: avalancheFuji.id });
    }
    const { message } = await api<{ message: string }>("/session", { wallet });
    const signature = await walletClient.signMessage({ account: wallet, message });
    await api("/session", { wallet, signature });
    setSnapshot(await api<ChainSnapshot>());
  }

  async function reconcile(current: ChainSnapshot, id: string, hash: Hash, attempts: number) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const result = await api<{ operation: ChainOperation; pending: boolean }>(`/${id}/confirmacion`, { hash });
      if (!result.pending) {
        storedHash(current.vault, id, null);
        setRecoveryId("");
        setRecoveryHash("");
        setMessage(result.operation.status === "confirmed" ? "Movimiento confirmado en Avalanche Fuji." : "La transacción fue revertida en Fuji.");
        setSnapshot(await api<ChainSnapshot>());
        return;
      }
      if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 1800));
    }
    setMessage("Fuji todavía está procesando el hash. Podés volver a verificarlo desde Conciliar transacción.");
    setSnapshot(await api<ChainSnapshot>());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;
    const current = snapshot;
    const fields = new FormData(event.currentTarget);
    void run(async () => {
      const walletClient = getWallet();
      const [account] = await walletClient.getAddresses();
      if (account?.toLowerCase() !== current.wallet.toLowerCase()) throw new Error("Seleccioná en la wallet la cuenta con la que iniciaste sesión.");
      if (await walletClient.getChainId() !== avalancheFuji.id) throw new Error("Seleccioná Avalanche Fuji en tu wallet.");
      const amount = String(fields.get("amount"));
      parseArgt(amount);
      const terms: IntercompanyTerms = kind === "loan" ? { kind, rateBps: parseRateBps(String(fields.get("rate"))) } : { kind };
      const { operation } = await api<{ operation: ChainOperation }>("", {
        id: crypto.randomUUID(), sourceId: Number(fields.get("source")), destinationId: Number(fields.get("destination")),
        amount, terms, note: fields.get("note"),
      });
      setSnapshot({ ...current, operations: [operation, ...current.operations] });
      setRecoveryId(operation.id);
      setRecoveryHash("");
      const hash = await walletClient.writeContract({
        account, chain: avalancheFuji, address: current.vault, abi: vaultAbi, functionName: "transferirInterno",
        args: [BigInt(operation.sourceId), BigInt(operation.destinationId), BigInt(operation.amount), operationReference(operation.id)],
      });
      storedHash(current.vault, operation.id, hash);
      setRecoveryHash(hash);
      setMessage(`Transacción enviada a Fuji. Hash: ${hash}`);
      await reconcile(current, operation.id, hash, 4);
    });
  }

  function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;
    const current = snapshot;
    void run(async () => {
      const hash = recoveryHash.trim();
      if (!recoveryId || !transactionHashPattern.test(hash)) throw new Error("Elegí una operación e ingresá su hash de Fuji.");
      await reconcile(current, recoveryId, hash as Hash, 2);
    });
  }

  const open = snapshot?.operations.filter(op => op.status === "pending" || op.status === "submitted") ?? [];
  const tokenLabel = automation ? "mARGt" : "ARGt";
  return <main className="rail-main rail-chain-page">
    <header className="rail-chain-header"><Link className="brand" href="/">fluuix</Link>
      <nav aria-label="Tesorería en Fuji"><Link href="/dashboard" aria-current={view === "dashboard" ? "page" : undefined}>Vista del grupo</Link><Link href="/mover" aria-current={view === "mover" ? "page" : undefined}>Mover caja</Link></nav>
      <span className="mock-badge"><span/> Avalanche Fuji</span>
    </header>
    <div className="dashboard-heading"><div><span className="eyebrow">FLUUIX / TREASURY RAIL</span>
      <h1>{view === "mover" ? "Movimiento intercompany" : "Tesorería del grupo"}</h1>
      <p>{view === "mover" ? "Prepará las condiciones y firmá la transferencia desde tu wallet." : "Saldos del vault y registro conciliado en Avalanche Fuji."}</p></div>
      {snapshot && <button className="secondary-button" disabled={busy} onClick={() => void run(async () => {
        await api("/session", { disconnect: true });
        setSnapshot(null);
      })}>Cerrar sesión</button>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="rail-chain-message" role="status">{message}</p>}
    {loading && <p role="status">Consultando sesión…</p>}
    {!loading && !snapshot && <div className="rail-form-panel">
      <div className="form-section-title"><span className="dialog-icon"><Wallet/></span><div><h2>Conectá la wallet del tesorero</h2><p>Firmá un mensaje para abrir tu sesión en el registro del vault.</p></div></div>
      <button className="button button-dark" disabled={busy} onClick={() => void run(connect)}>{busy ? "Conectando…" : "Conectar wallet"}</button>
    </div>}
    {snapshot && <>
      {view === "mover" && <form className="rail-form-panel rail-chain-transfer" onSubmit={submit}>
        <div className="form-section-title"><span className="dialog-icon"><ArrowDownUp/></span><div><h2>Preparar transferencia</h2><p>Vault {snapshot.vault}</p></div></div>
        <div className="form-columns"><label>Desde<select name="source" defaultValue="" required><option value="" disabled>Elegí origen</option>{snapshot.operativas.map(op => <option key={op.id} value={op.id}>{op.nombre} · {formatArgt(op.saldo)} ARGt</option>)}</select></label>
          <label>Hacia<select name="destination" defaultValue="" required><option value="" disabled>Elegí destino</option>{snapshot.operativas.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}</select></label></div>
        <div className="form-columns"><label>Capital en ARGt<input name="amount" inputMode="decimal" maxLength={60} required placeholder="500.000"/></label>
          <label>Concepto intercompany<select value={kind} onChange={event => setKind(event.target.value as IntercompanyTerms["kind"])}>{Object.entries(intercompanyLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
        {kind === "loan" && <label>Tasa pactada (% TNA)<input name="rate" required inputMode="decimal" maxLength={6} placeholder="12,5"/><small>El registro guarda la tasa como dato contable.</small></label>}
        <label>{kind === "other" ? "Detalle del movimiento" : "Nota contable (opcional)"}<input name="note" maxLength={120} required={kind === "other"}/></label>
        <button className="button button-dark submit-button" disabled={busy || snapshot.operativas.length < 2}>{busy ? "Procesando…" : "Preparar y firmar en Fuji"}</button>
      </form>}
      {view === "dashboard" && <section className="operations-grid rail-chain-operations" aria-label="Saldos en Fuji">{snapshot.operativas.map(op => <article className="operation-card" key={op.id}>
        <div className="operation-title"><span className="operation-avatar"><Building2 size={18}/></span><h2>{op.nombre}</h2></div><div className="operation-balance">{formatArgt(op.saldo)} <small>{tokenLabel}</small></div>
      </article>)}</section>}
      {view === "dashboard" && automation && <TreasuryAutomationPanel balance={snapshot.operativas.find(op => op.id === PALERMO_ID)?.saldo} onSettled={refreshSnapshot}/>}
      <Register operations={snapshot.operations} tokenLabel={tokenLabel}/>
      {!!open.length && <form className="rail-form-panel rail-chain-recovery" onSubmit={recover}>
        <div className="form-section-title"><span className="dialog-icon"><CircleHelp/></span><div><h2>Conciliar transacción</h2><p>Usá el hash de una operación que ya enviaste desde la wallet.</p></div></div>
        <label>Operación<select required value={recoveryId} onChange={event => {
          const id = event.target.value;
          const operation = open.find(op => op.id === id);
          setRecoveryId(id);
          setRecoveryHash(operation?.txHash || storedHash(snapshot.vault, id));
        }}><option value="">Elegí una operación</option>{open.map(op => <option key={op.id} value={op.id}>{op.sourceName} → {op.destinationName} · {formatArgt(op.amount)} ARGt · {op.id.slice(0, 8)}</option>)}</select></label>
        <label>Hash de la transacción<input value={recoveryHash} onChange={event => setRecoveryHash(event.target.value)} placeholder="0x…" maxLength={66} required spellCheck={false}/></label>
        <button className="button button-dark submit-button" disabled={busy}>Verificar en Fuji</button>
      </form>}
    </>}
  </main>;
}
