/** Local simulation of TreasuryVault.sol. Amounts use the token's 18 decimals. */
export const UNIT = BigInt("1000000000000000000");
const ZERO = BigInt(0);
export const RAIL_STORAGE_KEY = "fluuix-treasury-rail-v1";
export type Operativa = { id: number; nombre: string; saldo: string; minimo: string; objetivo: string; activa: boolean };
export type RailEvent = { id: string; tipo: "Depósito" | "Transferencia interna" | "Rebalanceo" | "Pago" | "Pago en lote" | "Operativa creada" | "Umbrales actualizados"; desde: string; hacia: string; monto: string; concepto: string; fecha: string; cantidad?: number; recipients?: Recipient[] };
export type RailState = { version: 1; operativas: Operativa[]; totalMovidoInterno: string; totalPagado: string; walletBalance: string; events: RailEvent[] };
export type Recipient = { nombre: string; wallet: string; monto: string };
export type RailAction = { type: "deposit"; id: number; amount: string } | { type: "transfer"; from: number; to: number; amount: string; concept: string } | { type: "rebalance"; id?: number } | { type: "batch"; from: number; recipients: Recipient[]; concept: string } | { type: "create"; name: string; minimum: string; target: string } | { type: "thresholds"; id: number; minimum: string; target: string } | { type: "faucet" };

export function parseArgt(raw: string, allowZero = false): string {
  const value = raw.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,18})?$/.test(value)) throw new Error("Usá formato argentino: 1.250.000,50 (puntos para miles, coma para decimales).");
  const [whole, fraction = ""] = value.replaceAll(".", "").split(",");
  const amount = BigInt(whole) * UNIT + BigInt(fraction.padEnd(18, "0"));
  if ((!allowZero && amount === ZERO) || amount < ZERO) throw new Error("El monto debe ser mayor a cero.");
  if (amount > BigInt(10) ** BigInt(36)) throw new Error("El monto supera el límite de esta demo.");
  return amount.toString();
}
export function formatArgt(raw: string, maximumDecimals = 2): string {
  const amount = BigInt(raw);
  const negative = amount < ZERO;
  const absolute = negative ? -amount : amount;
  const whole = new Intl.NumberFormat("es-AR").format(absolute / UNIT);
  const fraction = (absolute % UNIT).toString().padStart(18, "0").slice(0, maximumDecimals).replace(/0+$/, "");
  return `${negative ? "−" : ""}${whole}${fraction ? `,${fraction}` : ""}`;
}
export function inputArgt(raw: string): string { return formatArgt(raw, 18); }
export function dateArgentina(iso: string): string {
  const parts = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} · ${part("hour")}:${part("minute")}`;
}
export function estimatedTax(raw: string): string { return (BigInt(raw) * BigInt(12) / BigInt(1000)).toString(); }
export function totalBalance(state: RailState): string { return state.operativas.reduce((sum, op)=>sum+BigInt(op.saldo), ZERO).toString(); }
export function createInitialRailState(): RailState {
  return { version: 1, walletBalance:parseArgt("10.000.000"), totalMovidoInterno:"0", totalPagado:"0", operativas:[
    {id:0,nombre:"Caja central",saldo:parseArgt("10.000.000"),minimo:"0",objetivo:"0",activa:true},
    {id:1,nombre:"Local Palermo",saldo:"0",minimo:parseArgt("1.000.000"),objetivo:parseArgt("3.000.000"),activa:true},
    {id:2,nombre:"Local Belgrano",saldo:"0",minimo:parseArgt("750.000"),objetivo:parseArgt("2.000.000"),activa:true},
    {id:3,nombre:"Distribuidora SA",saldo:"0",minimo:parseArgt("500.000"),objetivo:parseArgt("1.000.000"),activa:true},
  ],events:[{id:"DEMO-INICIAL",tipo:"Depósito",desde:"Wallet de prueba",hacia:"Caja central",monto:parseArgt("10.000.000"),concepto:"Saldo inicial de la demo",fecha:"2026-11-07T13:00:00.000Z"}] };
}
export function isRailState(value: unknown): value is RailState {
  if (!value || typeof value!=="object") return false;
  const s=value as RailState;
  const amount=(v: unknown)=>typeof v==="string" && /^\d{1,40}$/.test(v);
  return s.version===1 && [s.walletBalance,s.totalMovidoInterno,s.totalPagado].every(amount) && Array.isArray(s.operativas) && s.operativas.length>0 && s.operativas.every((o,i)=>o && o.id===i && typeof o.nombre==="string" && typeof o.activa==="boolean" && [o.saldo,o.minimo,o.objetivo].every(amount) && BigInt(o.objetivo)>=BigInt(o.minimo)) && Array.isArray(s.events) && s.events.every(e=>e && typeof e.id==="string" && typeof e.tipo==="string" && typeof e.desde==="string" && typeof e.hacia==="string" && typeof e.concepto==="string" && amount(e.monto) && !Number.isNaN(Date.parse(e.fecha)));
}
export function applyRailAction(current: RailState, action: RailAction, now = new Date().toISOString()): { state: RailState; message: string } {
  const state=structuredClone(current);
  let eventIndex=state.events.length;
  const emit=(event:Omit<RailEvent,"id"|"fecha">)=>state.events.unshift({...event,id:`DEMO-${now}-${++eventIndex}`,fecha:now});
  const op=(id:number)=>{ const found=state.operativas[id]; if(!found?.activa)throw new Error("La operativa no está disponible.");return found; };
  const positive=(raw:string)=>{if(!/^\d+$/.test(raw)||BigInt(raw)<=ZERO)throw new Error("El monto debe ser mayor a cero.");return BigInt(raw);};
  const debit=(id:number,amount:bigint)=>{const source=op(id);if(amount>BigInt(source.saldo))throw new Error(`Saldo insuficiente en ${source.nombre}. Rebalanceá o depositá antes de pagar.`);source.saldo=(BigInt(source.saldo)-amount).toString();return source;};
  const rebalance=(id:number)=>{
    const target=op(id);if(id===0||BigInt(target.saldo)>=BigInt(target.minimo))return ZERO;
    const gap=BigInt(target.objetivo)-BigInt(target.saldo);const central=op(0);const available=BigInt(central.saldo);const moved=gap<available?gap:available;
    if(moved===ZERO)return ZERO;
    central.saldo=(available-moved).toString();target.saldo=(BigInt(target.saldo)+moved).toString();state.totalMovidoInterno=(BigInt(state.totalMovidoInterno)+moved).toString();
    emit({tipo:"Rebalanceo",desde:central.nombre,hacia:target.nombre,monto:moved.toString(),concepto:"Reposición automática hacia el objetivo"});return moved;
  };
  let message="Operación simulada completada.";
  if(action.type==="deposit"){
    const amount=positive(action.amount);const target=op(action.id);if(amount>BigInt(state.walletBalance))throw new Error("No tenés suficientes ARGt de prueba en la wallet.");
    state.walletBalance=(BigInt(state.walletBalance)-amount).toString();target.saldo=(BigInt(target.saldo)+amount).toString();emit({tipo:"Depósito",desde:"Wallet de prueba",hacia:target.nombre,monto:action.amount,concepto:"Ingreso de ARGt al grupo"});message=`Depositaste ${formatArgt(action.amount)} ARGt en ${target.nombre}.`;
  } else if(action.type==="transfer"){
    if(action.from===action.to)throw new Error("Elegí dos operativas distintas.");if(!action.concept.trim())throw new Error("Agregá el concepto contable del movimiento.");
    const amount=positive(action.amount);const target=op(action.to);const source=debit(action.from,amount);target.saldo=(BigInt(target.saldo)+amount).toString();state.totalMovidoInterno=(BigInt(state.totalMovidoInterno)+amount).toString();emit({tipo:"Transferencia interna",desde:source.nombre,hacia:target.nombre,monto:action.amount,concepto:action.concept.trim()});message="Movimiento interno registrado. La caja total del grupo se mantiene.";
  } else if(action.type==="rebalance"){
    const ids=action.id===undefined?state.operativas.filter(o=>o.id!==0&&o.activa).map(o=>o.id):[action.id];const moved=ids.reduce((sum,id)=>sum+rebalance(id),ZERO);
    message=moved>ZERO?`Se redistribuyeron ${formatArgt(moved.toString())} ARGt desde la caja central.`:state.operativas.some(o=>o.id>0&&BigInt(o.saldo)<BigInt(o.minimo))?"La caja central no tiene fondos para reponer las operativas.":"Todas las operativas están por encima de su mínimo. No hubo movimientos.";
  } else if(action.type==="batch"){
    if(action.recipients.length===0||action.recipients.length>100)throw new Error("El lote debe tener entre 1 y 100 destinatarios.");if(!action.concept.trim())throw new Error("Agregá un concepto para el pago.");
    let total=ZERO;for(const r of action.recipients){if(!r.nombre.trim()||!/^0x[0-9a-fA-F]{40}$/.test(r.wallet)||/^0x0{40}$/i.test(r.wallet))throw new Error(`Revisá el nombre y la wallet de ${r.nombre||"cada destinatario"}.`);total+=positive(r.monto);}
    const source=debit(action.from,total);state.totalPagado=(BigInt(state.totalPagado)+total).toString();emit({tipo:action.recipients.length===1?"Pago":"Pago en lote",desde:source.nombre,hacia:action.recipients.length===1?action.recipients[0].nombre:`${action.recipients.length} destinatarios`,monto:total.toString(),concepto:action.concept.trim(),cantidad:action.recipients.length,recipients:action.recipients});
    const moved=action.from===0?ZERO:rebalance(action.from);message=`${action.recipients.length} pago${action.recipients.length===1?"":"s"} simulado${action.recipients.length===1?"":"s"} por ${formatArgt(total.toString())} ARGt.${moved>ZERO?` Se repusieron ${formatArgt(moved.toString())} ARGt automáticamente.`:""}`;
  } else if(action.type==="create"||action.type==="thresholds"){
    if(!/^\d+$/.test(action.minimum)||!/^\d+$/.test(action.target)||BigInt(action.target)<BigInt(action.minimum))throw new Error("El objetivo debe ser igual o mayor al mínimo.");
    if(action.type==="create"){
      if(!action.name.trim()||action.name.trim().length>60)throw new Error("Ingresá un nombre de hasta 60 caracteres.");
      if(state.operativas.some(o=>o.nombre.toLocaleLowerCase()===action.name.trim().toLocaleLowerCase()))throw new Error("Ya hay una operativa con ese nombre.");
      const created={id:state.operativas.length,nombre:action.name.trim(),saldo:"0",minimo:action.minimum,objetivo:action.target,activa:true};state.operativas.push(created);emit({tipo:"Operativa creada",desde:"Tesorería",hacia:created.nombre,monto:"0",concepto:"Nueva operativa del grupo"});message="Operativa creada. Ya podés depositar o mover caja.";
    }else{const target=op(action.id);if(action.id===0)throw new Error("La caja central no tiene umbrales de reposición.");target.minimo=action.minimum;target.objetivo=action.target;emit({tipo:"Umbrales actualizados",desde:"Tesorería",hacia:target.nombre,monto:"0",concepto:`Mínimo ${formatArgt(action.minimum)} · Objetivo ${formatArgt(action.target)} ARGt`});message="Umbrales actualizados. Se aplicarán en el próximo rebalanceo.";}
  } else if(action.type==="faucet"){state.walletBalance=(BigInt(state.walletBalance)+BigInt(parseArgt("100.000"))).toString();message="Se agregaron 100.000 ARGt simulados a tu wallet de prueba.";}
  return {state,message};
}

/** RFC-style quoted fields, including a decimal comma when quoted. No external upload. */
export function parseRecipientsCsv(text:string):Recipient[]{
  const source=text.replace(/^\uFEFF/,"");const firstLine=source.split(/\r?\n/)[0];const separator=firstLine.includes(";")?";":",";
  const rows:string[][]=[];let row:string[]=[];let field="";let quoted=false;
  for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(field.trim());field="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&source[i+1]==="\n")i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;}
  if(quoted)throw new Error("El CSV contiene comillas sin cerrar.");row.push(field.trim());if(row.some(Boolean))rows.push(row);
  if(rows.length<2||rows[0].map(v=>v.toLowerCase()).join(",")!=="nombre,wallet,monto")throw new Error("El CSV debe comenzar con nombre,wallet,monto.");
  if(rows.length>101)throw new Error("Podés importar hasta 100 destinatarios por lote.");
  return rows.slice(1).map((r,i)=>{if(r.length!==3)throw new Error(`La fila ${i+2} debe tener 3 columnas. Poné entre comillas los montos con coma decimal.`);const [nombre,wallet,monto]=r;if(!nombre||!/^0x[0-9a-fA-F]{40}$/.test(wallet)||/^0x0{40}$/i.test(wallet))throw new Error(`Revisá el nombre y la wallet en la fila ${i+2}.`);return{nombre,wallet,monto:parseArgt(monto)};});
}
