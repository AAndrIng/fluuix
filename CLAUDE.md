# CLAUDE.md — Fluuix (HackaTwin 2026)

Contexto para cualquier sesión de Claude Code que trabaje en este repo. Leer primero.

## Qué es esto
- **Proyecto:** Fluuix (se escribe con doble "u") · **Producto:** Treasury Rail
- **Qué hace:** tesorería on-chain para holdings y empresas de LATAM. La caja de todas las sociedades del grupo está en stablecoins de moneda local de Twin (ARGt y sus equivalentes) sobre Avalanche, con liquidez instantánea entre sociedades y países, préstamos intercompany documentados automáticamente, pagos a proveedores, operaciones financieras 24/7 (colocar la caja ociosa, tomar crédito con garantía) y un agente de IA que optimiza la caja. Se usa por interfaz web o por API (headless) y alimenta al ERP de la empresa: **no es un ERP**.
- **Evento:** HackaTwin, sábado 7/11/2026 en Digital House (Monroe 860, CABA). **Entrega a las 18:00**, demo day a las 19:00.
- **Tracks:** Stablecoins (principal, con ARGt de Twin), Avalanche (contratos en Fuji y un bridge hacia Avalanche) e IA (agente de tesorería).

## Equipo
- **Bernardo Ortiz (Berni):** GTM del equipo. No es técnico; se ocupa de estrategia, modelo de negocio, llegada a mercado y pitch. Escribe en español rioplatense.
- Hay otros integrantes técnicos en el equipo.

## Dónde está cada cosa
| Archivo | Contenido |
|---|---|
| `docs/fluuix-treasury-rail.md` | Documento oficial: problema, solución, marco legal, cliente, GTM, modelo de negocio y demo |
| `resumen-500.md` | Resumen de menos de 500 caracteres para el formulario de entrega |
| `docs/machete-hackatwin.md` | Machete del evento: Twin, Avalanche, Team1, jurado, glosario técnico, Avalanche Academy, repos de referencia y links |
| `docs/gtm-conceptos.md` | Conceptos explicados para no técnicos: gas, Foundry, ZK, financiamiento, monetización, escalado |
| `docs/estrategia-interna.md` | Notas internas (no van al pitch ni a docs públicos) y riesgos que el jurado puede atacar |
| `docs/historial-chat.md` | Resumen cronológico de la conversación de preparación |
| `web/` | Frontend: Next.js 16 + Tailwind 4 + shadcn/ui (Radix, preset Nova: Lucide + Geist). Leer `web/AGENTS.md` antes de tocar código: Next 16 trae cambios importantes. |
| `backend/` | Backend y smart contracts |

## Stack técnico previsto
- **Smart contracts:** Solidity + Foundry. Como referencia de buenas prácticas, usar https://github.com/defi-wonderland/solidity-foundry-boilerplate
- **Red:** Avalanche **Fuji** testnet (chain ID 43113, RPC `https://api.avax-test.network/ext/bc/C/rpc`). Después, C-Chain.
- **Stablecoin:** ARGt (Twin). Para testnet, según la charla se consigue en faucet.chain.link (sin verificar, confirmar en el evento). Si no está disponible, usar un ERC-20 mock "ARGt".
- **Explorador:** https://testnet.snowtrace.io
- **Docs para el LLM:** `claude mcp add avalanche-mcp --transport http https://build.avax.network/api/mcp`
- **Más referencias** (Academy, repos de CCIP + ICM, Kumply, Monarch, etc.): ver la sección de links de `docs/machete-hackatwin.md`.
- **Opcionales:** eERC (pagos privados), Kumply (KYC/KYB on-chain), x402 (pagos por API para agentes), Morpho (colocar la caja ociosa).

## MVP sugerido para la demo (en el orden en que conviene construirlo)
1. **Treasury vault:** un contrato que guarde ARGt de varias sociedades u operativas del grupo con un saldo central.
2. **Transferencia intercompany instantánea** que genere su registro de préstamo (sociedad origen, destino, capital, interés, fecha), más **rebalanceo automático** cuando una sociedad queda por debajo de un mínimo (que no haya "hueco de caja").
3. **Pago en lote a proveedores** en ARGt.
4. **Dashboard:** vista 360 de la caja por sociedad, el registro de préstamos intercompany y contadores de **tiempo de liquidación** (segundos contra 24/48 hs) y **costos bancarios evitados**.
5. **Agente de IA:** la empresa define límites de riesgo, tasa objetivo y mercados habilitados; el agente opera contra la API, busca la mejor tasa y coloca la caja ociosa (Morpho o un mock). Opcional: que analice un historial importado de otra plataforma y sugiera cómo optimizar la caja. La integración con Belo (MCP) no está disponible todavía: simularla.
6. **Bridge hacia Avalanche** para sumar el track de Avalanche.

Mostrar las transacciones en Snowtrace durante la demo.

## Reglas de comunicación y producto (importante)
- **Nunca decir que ARGt "rinde".** La CNV frenó a Twin en marzo de 2026 por promocionar ARGt con rendimiento y levantó la sanción cuando quedó solo como medio de pago. Si hay rendimiento, viene de colocar la caja en un protocolo.
- **No prometer "eliminamos impuestos" ni mostrar un "impuesto al cheque ahorrado".** La frase correcta es: "los costos bancarios se pagan al entrar y al salir, no en cada movimiento interno".
- **Sueldos:** no prometer pago de sueldos en stablecoins (la ley laboral exige moneda de curso legal en cuenta sueldo). Pagos a proveedores, sí.
- **Intercompany:** en Argentina es legal si está documentado como préstamo o aporte. Fluuix automatiza esa documentación y todo queda auditable.
- Presentar el compliance (KYC/KYB, auditabilidad, plataforma non-custodial) como una ventaja. Lo legal es secundario al producto: tener la respuesta preparada, pero no ponerlo en el centro del pitch.
