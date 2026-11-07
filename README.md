# Fluuix — Treasury Rail

Tesorería on-chain para holdings y empresas de LATAM: la caja de todas las sociedades del grupo en stablecoins de moneda local (ARGt de Twin y sus equivalentes) sobre Avalanche, con liquidez instantánea entre sociedades y países, préstamos intercompany documentados automáticamente, pagos a proveedores, operaciones financieras 24/7 y un agente de IA que optimiza la caja. Se usa por interfaz o por API y alimenta al ERP.

Proyecto para **HackaTwin** (7/11/2026, Digital House, Buenos Aires) — track Stablecoins, con Avalanche e IA.

## Documentación
- [Resumen del proyecto: problema, solución, legal, cliente, GTM y modelo de negocio](docs/fluuix-treasury-rail.md)
- [Resumen de 500 caracteres](resumen-500.md)
- [Machete del evento: Twin, Avalanche, jurado, glosario, Academy y repos de referencia](docs/machete-hackatwin.md)
- [Conceptos explicados para no técnicos](docs/gtm-conceptos.md)
- Contexto para sesiones de Claude Code: [CLAUDE.md](CLAUDE.md)

## Stack previsto
- Smart contracts: Solidity + Foundry (base: [defi-wonderland/solidity-foundry-boilerplate](https://github.com/defi-wonderland/solidity-foundry-boilerplate))
- Red: Avalanche Fuji (testnet, chain ID 43113) → C-Chain
- Stablecoin: ARGt (Twin)
- Explorador: [Snowtrace testnet](https://testnet.snowtrace.io)
- Frontend: Next.js 16 + Tailwind 4 + shadcn/ui
- Docs para LLMs: Avalanche MCP `https://build.avax.network/api/mcp`

## Estructura
```
docs/        documentación de producto, negocio y contexto del evento
web/         frontend (Next.js)
backend/     backend y smart contracts
```
