import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { formatRate, intercompanyLabels, snowtraceTransaction } from "@/lib/intercompany";
import { dateArgentina, formatArgt, type RailEvent } from "@/lib/treasury-rail";
import { treasuryConfig } from "@/lib/config";

export default function IntercompanyRegister({ events }: { events: RailEvent[] }) {
  const entries = events.filter(event => event.tipo === "Transferencia interna");
  return <section className="payments-panel intercompany-panel" aria-labelledby="intercompany-heading">
    <div className="payments-heading"><div><span className="eyebrow">CAPITAL ENTRE EMPRESAS</span><h2 id="intercompany-heading">Registro intercompany</h2><p>Préstamos y aportes con sus condiciones, para conciliar con contabilidad.</p></div><Link className="secondary-button" href="/mover">Registrar movimiento <ArrowUpRight size={14}/></Link></div>
    <div className="table-scroll">{entries.length ? <table><thead><tr><th>ORIGEN</th><th>DESTINO</th><th>TIPO</th><th>CAPITAL</th><th>INTERÉS</th><th>FECHA · ARGENTINA</th><th>SNOWTRACE</th></tr></thead><tbody>
      {entries.map(entry => {
        const txUrl = snowtraceTransaction(entry.txHash, treasuryConfig.explorerUrl);
        return <tr key={entry.id}><td>{entry.desde}</td><td>{entry.hacia}</td><td title={entry.concepto}>{entry.intercompany ? intercompanyLabels[entry.intercompany.kind] : entry.concepto}</td><td className="amount-cell">{formatArgt(entry.monto)} <small>ARGt</small></td><td>{entry.intercompany?.rateBps !== undefined ? formatRate(entry.intercompany.rateBps) : "—"}</td><td className="event-date">{dateArgentina(entry.fecha)}</td><td>{txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" className="row-link">Ver transacción <ArrowUpRight size={12}/></a> : <span className="event-date">Demo · sin hash</span>}</td></tr>;
      })}
    </tbody></table> : <div className="empty-state"><FileText size={26}/><h3>Tus movimientos intercompany aparecen acá.</h3><p>Registrá un préstamo, aporte u otro movimiento desde Mover caja.</p></div>}</div>
  </section>;
}
