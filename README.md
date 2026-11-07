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
web/src/lib/server/  lógica del backend Next.js
web/db/              migraciones de Postgres
```


## Estado y revisión de seguridad del snapshot

El archivo entregado con referencia declarada `6db42cb…` incluye el backend de intercompany
y automatización de préstamos de prueba en Fuji. No incluye fuentes Solidity ni un backend
independiente. El circuito automático usa una wallet del servidor; la actividad comercial
es simulada y la predicción del modelo es opcional. La visión del producto no implica que
todo el roadmap esté implementado.

El paquete audit-fix v2 añade controles y pruebas, sin cambiar dependencias. **No está
aprobado para producción bancaria ni para fondos reales.**

- [Informe y alcance](docs/auditoria-v2/INFORME.md).
- [Aplicación, validación y rollback](docs/auditoria-v2/APLICACION-Y-VALIDACION.md).
- [Criterios para calificar](docs/auditoria-v2/CALIFICACION.md).
- [Texto del PR de borrador](docs/auditoria-v2/PR-audit-fix.md).

Importante: la migración de revocación es **003**. No sobrescribir la 002 de automatización.
