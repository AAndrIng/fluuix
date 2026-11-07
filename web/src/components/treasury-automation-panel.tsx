"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";
import { treasuryConfig } from "@/lib/config";
import { formatRate, snowtraceTransaction } from "@/lib/intercompany";
import { scenarios, type ActivityScenario, type AutomationMode, type AutomationRun } from "@/lib/treasury-automation";
import { formatArgt } from "@/lib/treasury-rail";

const statusNames = { scheduled: "Programado", vetoed: "Vetado", skipped: "Sin movimiento", submitted: "Procesando en Fuji", confirmed: "Confirmado", reverted: "Revertido" };
const thresholdNames = { ai: "Umbral de IA", fixed: "Regla fija", simulated: "Umbral simulado" };
const isActive = (run: AutomationRun) => run.status === "scheduled" || run.status === "submitted";

class AutomationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(body?: object): Promise<T & { serverNow: number }> {
  const response = await fetch("/api/intercompany/automatizacion", {
    cache: "no-store",
    ...(body && { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new AutomationError(data.error ?? "La automatización no respondió.", response.status);
  return data;
}

function activityChange(actual: number, usual: number) {
  const change = Math.round((actual - usual) * 100 / usual);
  return `${change > 0 ? "+" : ""}${change}%`;
}

export default function TreasuryAutomationPanel({ balance, onSettled }: { balance?: string; onSettled: () => Promise<void> }) {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [scenario, setScenario] = useState<ActivityScenario>("surge");
  const [mode, setMode] = useState<AutomationMode>("normal");
  const [demoAllowed, setDemoAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clockOffset, setClockOffset] = useState(0);
  const [clock, setClock] = useState(0);
  const active = runs.find(isActive);
  const latest = active ?? runs[0];
  const activeId = active?.id;
  const deadline = active?.status === "scheduled" && active.executeAt ? Date.parse(active.executeAt) : 0;
  const seconds = deadline && clock ? Math.max(0, Math.ceil((deadline - clock - clockOffset) / 1000)) : 0;
  const due = active?.status === "submitted" || Boolean(deadline && clock && seconds === 0);

  useEffect(() => {
    let mounted = true;
    request<{ runs: AutomationRun[]; demoAllowed: boolean }>().then(data => {
      if (!mounted) return;
      setRuns(data.runs);
      setDemoAllowed(data.demoAllowed === true);
      setClockOffset(data.serverNow - Date.now());
      setClock(Date.now());
    }).catch(error => { if (mounted) setError(error.message); }).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => setClock(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [deadline]);

  useEffect(() => {
    if (!activeId || !due) return;
    let mounted = true;
    let timer: number;

    async function advance() {
      try {
        const { run } = await request<{ run: AutomationRun }>({ action: "advance", id: activeId });
        if (!mounted) return;
        setError("");
        setRuns(current => current.map(previous => previous.id === run.id ? run : previous));
        if (isActive(run)) timer = window.setTimeout(advance, 900);
        else await onSettled();
      } catch (error) {
        if (!mounted) return;
        setError(error instanceof Error ? error.message : "Fuji sigue procesando la propuesta.");
        if (!(error instanceof AutomationError) || error.status >= 500) timer = window.setTimeout(advance, 2400);
      }
    }

    timer = window.setTimeout(advance, 0);
    return () => { mounted = false; window.clearTimeout(timer); };
  }, [activeId, due, onSettled]);

  async function submit(body: object) {
    setBusy(true);
    setError("");
    try {
      const { run, serverNow } = await request<{ run: AutomationRun }>(body);
      setClockOffset(serverNow - Date.now());
      setClock(Date.now());
      setRuns(current => [run, ...current.filter(previous => previous.id !== run.id)].slice(0, 8));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Volvé a intentar.");
    } finally {
      setBusy(false);
    }
  }

  const activity = active?.activity ?? scenarios[scenario];
  const url = latest?.status === "confirmed" ? snowtraceTransaction(latest.txHash ?? undefined, treasuryConfig.explorerUrl) : null;
  return <section className="rail-form-panel treasury-automation" aria-labelledby="treasury-automation-title">
    <div className="form-section-title"><span className="dialog-icon"><Sparkles size={19}/></span><div>
      <span className="eyebrow">TESORERÍA AUTÓNOMA</span><h2 id="treasury-automation-title">Anticipá faltantes de caja</h2>
      <p>El agente evalúa la actividad de Palermo y propone un préstamo según la política de tesorería.</p>
    </div></div>
    <div className="treasury-signals" aria-label="Señales de Palermo">
      <div><span>Tráfico · Datos de demo</span><strong>{activityChange(activity.traffic, activity.usualTraffic)}</strong></div>
      <div><span>Ventas · Datos de demo</span><strong>{activityChange(activity.sales, activity.usualSales)}</strong></div>
      <div><span>Saldo de Palermo · Fuji</span><strong>{balance === undefined ? "—" : `${formatArgt(balance, 18)} mARGt`}</strong></div>
    </div>
    <div className="form-columns">
      <label>Actividad · última hora<select value={active?.scenario ?? scenario} disabled={busy || Boolean(active)} onChange={event => setScenario(event.target.value as ActivityScenario)}><option value="surge">Pico de tráfico y ventas</option><option value="normal">Actividad habitual</option></select></label>
      <label>Ventana de veto<select value={active?.mode ?? mode} disabled={busy || Boolean(active)} onChange={event => setMode(event.target.value as AutomationMode)}><option value="normal">Modo normal · 3 minutos</option>{(demoAllowed || active?.mode === "demo") && <option value="demo" disabled={!demoAllowed}>Escenario de pitch · 5 segundos</option>}</select></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {latest && <div className="treasury-decision" aria-live="polite">
      <span className="eyebrow">{statusNames[latest.status]} · {thresholdNames[latest.thresholdSource]}</span>
      <p>{latest.explanation}</p>
      {latest.loan && <strong>{latest.loan.sourceName} → {latest.loan.destinationName} · {formatArgt(latest.loan.amount, 18)} mARGt · {formatRate(latest.loan.rateBps)}</strong>}
      {latest.result && <p>{latest.result}</p>}
      {url && <a className="row-link" href={url} target="_blank" rel="noreferrer">Ver en Snowtrace <ArrowUpRight size={14}/></a>}
    </div>}
    <div className="treasury-automation-actions">
      {active ? <>
        <span><Clock3 size={16}/> {active.status === "scheduled" && seconds > 0 ? `Se ejecuta en ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Procesando en Fuji…"}</span>
        {active.status === "scheduled" && seconds > 0 && <button className="secondary-button" disabled={busy} onClick={() => void submit({ action: "veto", id: active.id })}>Vetar</button>}
      </> : <button className="button button-dark" disabled={!ready || busy} onClick={() => void submit({ action: "evaluate", scenario, mode })}>{busy ? "Evaluando señales…" : "Evaluar tesorería"}</button>}
      <small>Mantené esta pestaña abierta para ejecutar al vencer el plazo.</small>
    </div>
    {runs.length > 1 && <details className="treasury-history"><summary>Evaluaciones anteriores</summary><ul>{runs.filter(run => run.id !== latest?.id).map(run => <li key={run.id}><strong>{statusNames[run.status]}</strong> · {run.explanation} {run.result}</li>)}</ul></details>}
    <Link className="row-link" href="/agente">Ver simulación de colocación de excedentes <ArrowUpRight size={12}/></Link>
  </section>;
}
