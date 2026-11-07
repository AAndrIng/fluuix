"use client";

import { useState, type FormEvent } from "react";
import { Activity, Check, CircleHelp, ShieldCheck } from "lucide-react";
import { dateArgentina, formatArgt, type Operativa } from "@/lib/treasury-rail";
import { formatRate, parseRateBps } from "@/lib/intercompany";

const markets = [
  { id: "belo", name: "Belo · liquidez local", risk: 1, tna: 1800 },
  { id: "pool", name: "Pool de crédito en pesos", risk: 2, tna: 2450 },
  { id: "term", name: "Crédito a plazo en pesos", risk: 3, tna: 3200 },
];
const risks = ["Bajo", "Medio", "Alto"];
type Decision = { id: number; time: string; proposal: string | null; reasons: string[] };

export default function TreasuryAgent({ operativas, ready }: { operativas: Operativa[]; ready: boolean }) {
  const [risk, setRisk] = useState(1);
  const [target, setTarget] = useState("15");
  const [exposure, setExposure] = useState(20);
  const [enabled, setEnabled] = useState<string[]>(["belo", "pool"]);
  const [log, setLog] = useState<Decision[]>([]);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);
  const latest = log[0];

  function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const threshold = parseRateBps(target);
      setError("");
      const reasons: string[] = [];
      const candidates = markets.filter(market => {
        if (!enabled.includes(market.id)) { reasons.push(`${market.name}: mercado deshabilitado.`); return false; }
        if (market.risk > risk) { reasons.push(`${market.name}: supera el límite de riesgo.`); return false; }
        if (market.tna < threshold) { reasons.push(`${market.name}: ${formatRate(market.tna)}, por debajo de la tasa objetivo.`); return false; }
        return true;
      }).sort((a, b) => b.tna - a.tna);
      const zero = BigInt(0);
      const sources = operativas.filter(op => op.activa).map(op => {
        const balance = BigInt(op.saldo);
        const reserve = op.id === 0
          ? (balance + BigInt(1)) / BigInt(2)
          : BigInt(op.objetivo);
        return { name: op.nombre, idle: balance > reserve ? balance - reserve : zero };
      }).sort((a, b) => a.idle > b.idle ? -1 : a.idle < b.idle ? 1 : 0);
      const market = candidates[0];
      const source = sources[0];
      const capital = source ? source.idle * BigInt(exposure) / BigInt(100) : zero;
      let proposal: string | null = null;
      if (!market) reasons.unshift("Ningún mercado cumple las condiciones de la política.");
      else if (!source || capital === zero) reasons.unshift("No hay caja ociosa disponible después de reservar liquidez.");
      else {
        proposal = `Colocar ${formatArgt(capital.toString(), 18)} ARGt de ${source.name} en ${market.name} a ${formatRate(market.tna)}.`;
        reasons.unshift(`${market.name}: cumple la política y tiene la mayor tasa entre los mercados elegibles.`, `${source.name}: ${formatArgt(source.idle.toString())} ARGt disponibles sobre la reserva. Se propone usar el ${exposure}%.`);
        for (const alternative of candidates.slice(1)) reasons.push(`${alternative.name}: elegible, con una tasa menor (${formatRate(alternative.tna)}).`);
      }
      setLog(previous => [{ id: (previous[0]?.id ?? 0) + 1, time: new Date().toISOString(), proposal, reasons }, ...previous].slice(0, 12));
      setChanged(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Revisá los parámetros de la política."); }
  }

  return <>
    <div className="rail-form-layout agent-layout">
      <form className="rail-form-panel" onSubmit={evaluate} onChange={() => setChanged(true)}>
        <div className="form-section-title"><span className="dialog-icon"><ShieldCheck/></span><div><h2>Política de tesorería</h2><p>Estos límites se aplican a cada evaluación.</p></div></div>
        <div className="form-columns">
          <label>Riesgo máximo<select value={risk} onChange={e => setRisk(Number(e.target.value))}>{risks.map((label, i) => <option key={label} value={i + 1}>{label}</option>)}</select></label>
          <label>Tasa objetivo (% TNA)<input value={target} onChange={e => setTarget(e.target.value)} required inputMode="decimal"/></label>
        </div>
        <label>Máximo a colocar: {exposure}% de la caja ociosa<input type="range" min="1" max="100" value={exposure} onChange={e => setExposure(Number(e.target.value))}/></label>
        <fieldset className="agent-markets"><legend>Mercados habilitados · simulados</legend>{markets.map(market => <label key={market.id}><input type="checkbox" checked={enabled.includes(market.id)} onChange={e => setEnabled(e.target.checked ? [...enabled, market.id] : enabled.filter(id => id !== market.id))}/><span>{market.name}<small>Riesgo {risks[market.risk - 1].toLowerCase()} · {formatRate(market.tna)}</small></span></label>)}</fieldset>
        {error && <div role="alert" className="form-error">{error}</div>}
        <button className="button button-dark submit-button" disabled={!ready}><Activity size={16}/> Evaluar oportunidades</button>
      </form>
      <aside className="rail-form-aside">
        <div className="estimate-card agent-proposal" aria-live="polite"><span className="eyebrow">RECOMENDACIÓN SIMULADA</span><h2>{latest ? changed ? "Política modificada" : latest.proposal ?? "Mantener la caja disponible." : "Tu próxima decisión, con contexto."}</h2><p>{changed && latest ? "Volvé a evaluar para aplicar los cambios." : latest ? latest.reasons[0] : "Evaluá la política para encontrar un mercado habilitado que cumpla la tasa objetivo y el límite de riesgo."}</p><div className="estimate-divider"/><span className="estimate-foot"><Check size={15}/> Sin ejecución automática</span></div>
        <div className="form-tip"><CircleHelp size={18}/><div><h3>Cómo protege la liquidez</h3><p>Reserva la mitad de la caja central y el saldo objetivo de cada operativa. La conexión con Belo y las tasas son ficticias; la evaluación corre por reglas en el navegador.</p></div></div>
      </aside>
    </div>
    <section className="payments-panel agent-log"><div className="payments-heading"><div><h2>Log de decisiones</h2><p>Por qué el agente recomendó o descartó cada alternativa.</p></div></div>{log.length ? <ol>{log.map(decision => <li key={decision.id}><div><strong>{decision.proposal ? "Recomendación generada" : "Sin recomendación"}</strong><time dateTime={decision.time}>{dateArgentina(decision.time)}</time></div>{decision.proposal && <p>{decision.proposal}</p>}<ul>{decision.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></li>)}</ol> : <p className="agent-empty">La primera evaluación aparece acá.</p>}</section>
  </>;
}
