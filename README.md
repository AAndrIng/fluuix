# Fluuix — Treasury Rail

Tesorería on-chain para empresas de LATAM: la caja de todo el grupo en stablecoins de moneda local (ARGt de Twin) sobre Avalanche, con transferencias instantáneas entre operativas, pagos de sueldos y proveedores, inversión 24/7 y flujo de caja predictivo.

Proyecto para **HackaTwin** (7/11/2026, Digital House, Buenos Aires) — track Stablecoins.

## Documentación
- [Resumen del proyecto: problema, solución, cliente, GTM y modelo de negocio](docs/fluuix-treasury-rail.md)
- [Resumen de 500 caracteres](docs/resumen-500.md)
- Contexto para sesiones de Claude Code: [CLAUDE.md](CLAUDE.md) y carpeta [context/](context/)

## Stack previsto
- Smart contracts: Solidity + Foundry (base: [defi-wonderland/solidity-foundry-boilerplate](https://github.com/defi-wonderland/solidity-foundry-boilerplate))
- Red: Avalanche Fuji (testnet, chain ID 43113) → C-Chain
- Stablecoin: ARGt (Twin)
- Explorador: [Snowtrace testnet](https://testnet.snowtrace.io)
- Docs para LLMs: Avalanche MCP `https://build.avax.network/api/mcp`

## Estructura
```
docs/        documentación de producto y negocio
context/     machete del evento, conceptos GTM, estrategia interna, historial
contracts/   smart contracts (Foundry)
app/         frontend
```
