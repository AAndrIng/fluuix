# CLAUDE.md — Fluuix (HackaTwin 2026)

Contexto para cualquier sesión de Claude Code que trabaje en este repo. Leer primero.

## Qué es esto
- **Proyecto:** Fluuix (se escribe con doble "u") · **Producto:** Treasury Rail
- **Qué hace:** tesorería on-chain para PyMEs y holdings de LATAM. La caja del grupo está en stablecoins de moneda local (ARGt de Twin) sobre Avalanche, con transferencias instantáneas entre operativas, pagos de sueldos y proveedores, inversión de la caja ociosa 24/7 y flujo de caja predictivo.
- **Evento:** HackaTwin, sábado 7/11/2026 en Digital House (Monroe 860, CABA). **Entrega a las 18:00**, demo day a las 19:00.
- **Track principal:** Stablecoins. AI es secundario y solo si suma.

## Equipo
- **Bernardo Ortiz (Berni):** GTM del equipo. No es técnico; se ocupa de estrategia, modelo de negocio, llegada a mercado y pitch. Escribe en español rioplatense.
- Hay otros integrantes técnicos en el equipo.

## Dónde está cada cosa
| Archivo | Contenido |
|---|---|
| `docs/fluuix-treasury-rail.md` | Documento oficial: problema, solución, cliente, GTM y modelo de negocio |
| `docs/resumen-500.md` | Resumen de menos de 500 caracteres para el formulario de entrega |
| `context/machete-hackatwin.md` | Machete del evento: Twin, Avalanche, Team1, jurado, glosario técnico, ideas y links |
| `context/gtm-conceptos.md` | Conceptos explicados para no técnicos: gas, Foundry, ZK, financiamiento, monetización, escalado |
| `context/estrategia-interna.md` | Notas internas (no van al pitch ni a docs públicos) y riesgos que el jurado puede atacar |
| `context/historial-chat.md` | Resumen cronológico de la conversación de preparación |

## Stack técnico previsto
- **Smart contracts:** Solidity + Foundry. Como referencia de buenas prácticas, usar https://github.com/defi-wonderland/solidity-foundry-boilerplate
- **Red:** Avalanche **Fuji** testnet (chain ID 43113, RPC `https://api.avax-test.network/ext/bc/C/rpc`). Después, C-Chain.
- **Stablecoin:** ARGt (Twin). Para testnet, según la charla se consigue en faucet.chain.link (sin verificar, confirmar en el evento). Si no está disponible, usar un ERC-20 mock "ARGt".
- **Explorador:** https://testnet.snowtrace.io
- **Docs para el LLM:** `claude mcp add avalanche-mcp --transport http https://build.avax.network/api/mcp`
- **Opcionales:** eERC (pagos privados), Kumply (KYC/KYB on-chain), x402 (pagos por API para agentes), Morpho (colocar la caja ociosa).

## MVP sugerido para la demo (en el orden en que conviene construirlo)
1. **Treasury vault:** un contrato que guarde ARGt de varias "operativas" (subcuentas o razones sociales del grupo) con un saldo central.
2. **Transferencia instantánea entre operativas** y **rebalanceo automático** cuando una operativa queda por debajo de un mínimo (que no haya "hueco de caja").
3. **Pago en lote** de sueldos y proveedores en ARGt.
4. **Dashboard:** vista 360 de la caja por operativa más un contador de "impuesto al cheque ahorrado" (0,6% por cada débito y crédito bancario evitado). Es el número que vende.
5. Opcionales: colocar la caja ociosa en un mercado de Morpho (o un mock) y una proyección simple del flujo de caja.

Mostrar las transacciones en Snowtrace durante la demo.

## Reglas de comunicación y producto (importante)
- **Nunca decir que ARGt "rinde".** La CNV frenó a Twin en marzo de 2026 por promocionar ARGt con rendimiento y levantó la sanción cuando quedó solo como medio de pago. Si hay rendimiento, viene de colocar la caja en un protocolo.
- **No prometer "eliminamos impuestos".** La frase correcta es: "pagás el impuesto bancario una vez al entrar, no veinte veces adentro".
- Las transferencias entre razones sociales distintas siguen siendo operaciones entre sociedades: quedan registradas y son auditables (préstamos o aportes entre compañías).
- Presentar el compliance (KYC, auditabilidad) como una ventaja.
