# 🧠 Machete HackaTwin — Twin × Avalanche / Team1

> **Evento:** HackaTwin — sábado 7/11/2026, Digital House (Monroe 860, Belgrano, CABA)
> **Agenda:** 8:00 check-in · 9:00 kickoff + build · **18:00 entrega** · 19:00 demo day · 21:00 cierre
> **Tracks:** AI · Blockchain · Fintech (pagos/remesas LATAM) · Stablecoins — equipos de hasta 4
> **Presentan:** Twin, BitGo, Digital House, Belo, Tether, Team1 Avalanche · Partners: Vercel, Firecrawl, Plugin, Paisanos
> Página: https://luma.com/cudf7cqz

---

## TL;DR (leer esto si hay 2 minutos)

- **Twin** = emisor de stablecoins en moneda local LATAM (ARGt = peso argentino 1:1). **Avalanche** = plataforma para crear blockchains (L1s). **Team1** = brazo de comunidad de Avalanche.
- **Juez clave: Sebastián Luján** (dev en WakeUp Labs + mundo Twin). Le interesa: inversión/liquidez accesible para no-bancarizados, y **pagos privados con Twin** (dijo que es ambicioso pero con chances de ganar).
- **Idea #1 recomendada:** pagos privados en ARGt usando **eERC** (Encrypted ERC de Avalanche) + KYC on-chain (**Kumply**) → privacidad para el público, auditabilidad para el regulador.
- **Idea #2:** on/off-ramp P2P estilo **zkP2P** (ARS ↔ ARGt verificando la transferencia con prueba ZK).
- **Idea #3:** **arbitraje/hedging de tasa** con ARGt (Morpho/Monarch, Curve, Chainlink).
- **Stack:** Solidity + **Foundry** (base: `defi-wonderland/solidity-foundry-boilerplate`) → deploy en **Fuji** → verificar en **Snowtrace**. LLM conectado al **Avalanche MCP**.
- ⚠️ **No vender ARGt como inversión con rendimiento**: la CNV la frenó en marzo 2026 por eso y levantó la sanción cuando quedó solo como medio de pago.

---

## 1. Quién es quién (definiciones de una línea)

| Entidad | Qué es |
|---|---|
| **Twin (Twin Finance)** | Infraestructura de stablecoins en moneda local y activos tokenizados para LATAM (ex *Num Finance*, con sede en Uruguay). Emite ARGt, BRAt, BOLt, MEXt, COLt, PERt, CHLt. |
| **Avalanche** | Plataforma blockchain para construir y lanzar tus propias blockchains (Avalanche L1s), con la C-Chain (compatible EVM) como red principal pública. |
| **Team1** | La DAO/comunidad global de embajadores de Avalanche: organiza meetups, workshops y hackathons. Mismo "grupito" que Avalanche, lado comunidad. Hay Team1 LATAM. |
| **ARGt** | Peso argentino tokenizado, paridad 1:1 con ARS, respaldado/sobrecolateralizado (saldos en ARS, FCI money market, USDT/USDC). Se usa mucho vía Belo. |

### Contexto regulatorio de Twin (útil para el pitch)
- Marzo 2026: la **CNV** consideró a ARGt un valor negociable porque se promocionaba con hasta 32% APR, y ordenó frenar la emisión/oferta.
- Abril 2026: la CNV **levantó la sanción** tras eliminar toda referencia a rendimientos → ARGt funciona como **medio de pago**. Twin anunció además nuevas stablecoins para Brasil, Bolivia, México, Colombia, Chile, etc.
- Twin trabaja con **DIA** (oráculos de precio con tipos de cambio "reales/ejecutables" de LATAM) y **DAMM Capital** (mercados de préstamo en **Morpho** con estas stablecoins).
- 👉 En el pitch: hablar de **pagos, liquidación, remesas, liquidez**; si hay rendimiento, que venga de un protocolo (ej. ser LP o prestar en Morpho), no "ARGt rinde X%".

---

## 2. Personas clave

| Persona | Rol | Notas |
|---|---|---|
| **Sebastián Luján** ⭐ | **Jurado.** Dev en **WakeUp Labs** (estudio de desarrollo web3 LATAM, foco en ZK/privacidad y escalabilidad, chains EVM) y activo en el ecosistema Twin. LinkedIn: uy.linkedin.com/in/sebastianlujan (figura en Montevideo; background open source y seguridad). | Habló de: banca para no-bancarizados, ser proveedor de liquidez, mecanismos de inversión que antes eran solo para grandes y que blockchain democratiza. Le gusta **pagos privados con Twin** como idea ganadora. WakeUp = mucho ZK → un proyecto con privacidad le va a resonar. |
| **Sofía Priore** | Líder de **Team1 LATAM** (Avalanche). En X: [@Sofpriore](https://x.com/Sofpriore) — bio: Marketing & Comm, Web3, miembro de @AvaxTeam1, construye @Shebn_ (comunidad Women in Web3), CMO de @buckspay_. Cofundadora de **GO LATAM** (@Golatam_web3, contenido/podcast sobre tokenización y pagos cripto en LATAM). | Conocida en "Recreo". Fue **mentora y jurado** en la Avalanche Hackathon LatAm Institucional, donde dio la mentoría de **Compliance Web3**; también panelista sobre regulación en Cripto Latin Fest 2026. → Le va a importar el ángulo de **compliance/KYC** (Kumply + viewing keys de eERC). Buena para dudas de Avalanche (L1, eERC, faucets). |
| **Cande Font** | **Marketing en Twin**, muy técnica. | Conocida en Recreo. No encontré perfil público confirmado; posible X: [@f0ntzz](https://x.com/f0ntzz) (aparece etiquetada junto a Sofía, **sin confirmar**). Buena fuente para cómo integrar ARGt en testnet y qué valora Twin. |
| **Mateo Moragues** | Head of Ops & Finance de Twin. | Fue mentor/jurado de la Córdoba Hack (24 h integrando stablecoins de Twin) → probablemente esté. |
| **Rafael De Ambrosi** | CEO de Twin. | — |

---

## 3. Conceptos que se nombraron (glosario rápido)

### Pagos e identidad
- **x402** — Estándar abierto que "activa" el código HTTP **402 Payment Required**: el servidor responde 402 con monto/token/red/dirección, el cliente (persona o **agente de IA**) firma el pago y reintenta con un header (`PAYMENT-SIGNATURE`). Settle on-chain en ~2 s en Avalanche, gasless para el usuario (un *facilitator* paga el gas, ~US$0.001). Ideal para micropagos, APIs pay-per-use y pagos entre agentes.
  - Facilitators en Avalanche: Thirdweb x402, PayAI, Ultravioleta DAO, x402-rs.
- **Pagos agénticos** — agentes de IA que pagan solos (x402 + identidad del agente).
- **KYC / KYB / KYA** — *Know Your Customer / Business / Agent*: verificar quién es la persona, la empresa o el **dueño de un agente de IA** antes de dejarlo mover fondos.
- **Kumply** (se escribe K-U-M-P-L-Y) — Sponsor de identidad: capa de compliance on-chain para Avalanche (KYC/KYB/**KYA**), no-custodial (los documentos los procesa Sumsub, Kumply solo guarda pruebas criptográficas). Tiene SDK `@kumply/sdk` que funciona en Fuji. Sirve para saber si quien transfiere está verificado/no sancionado (ej. no es terrorista ni lavado).

### Avalanche
- **Avalanche L1** (antes "subnets") — tu propia blockchain soberana dentro de Avalanche: elegís validadores, token de gas, permisos (pública o privada). En la charla: "la L1 como la chain para hacer pagos" = una chain dedicada a pagos (ej. con ARGt como gas, permisionada para KYC).
- **C-Chain** — la chain EVM pública principal de Avalanche (donde se deploya Solidity normal).
- **ICM / Teleporter** — mensajería nativa entre L1s de Avalanche (*Interchain Messaging*).
- **eERC (Encrypted ERC)** 🔑 — Estándar de token **confidencial** de Avalanche (AvaCloud): balances y montos encriptados on-chain (zk-SNARKs + cifrado homomórfico parcial); emisor, receptor y timestamp quedan públicos. Auditable vía *viewing keys* (un auditor/regulador puede ver). Dos modos:
  - **Standalone**: token privado desde cero.
  - **Converter**: envuelve un ERC-20 existente (ej. **ARGt**) → depositás y queda encriptado, retirás y vuelve a ser público. ← **esto es lo que necesitamos para "pagos privados con Twin"**.
  - Costo: ~947k gas por transferencia (~15× un ERC-20). Funciona en C-Chain, Fuji y L1s custom.
- **Fuji** — testnet de Avalanche (Chain ID **43113**, RPC `https://api.avax-test.network/ext/bc/C/rpc`).
- **Snowtrace** — explorador de bloques de Avalanche (como Etherscan). Testnet: `testnet.snowtrace.io`.

### Herramientas dev
- **Foundry** — toolkit en Rust para Solidity: `forge` (build/test/deploy), `cast` (llamadas a la chain desde CLI), `anvil` (nodo local), `chisel` (REPL). Tests escritos en Solidity, muy rápido.
- **Solidity Foundry Boilerplate** (Wonderland) — template "production ready": estructura de carpetas, tests unit/integración/fuzzing (Medusa, Halmos), linter, natspec, CI. **Usarlo como referencia para el LLM** (pasarle el repo como contexto de buenas prácticas).
- **faucet.chain.link** — faucet de testnet de Chainlink. Según la charla, ahí se consigue **ARGt de testnet** (+ AVAX de Fuji para gas). *(No lo pude verificar online, confirmar en el lugar.)*

### DeFi / oportunidades
- **Proveedor de liquidez (LP)** — depositás tokens en un pool para que otros hagan swaps/préstamos y cobrás fees/intereses. Antes era cosa de bancos/market makers; on-chain lo puede hacer cualquiera.
- **Morpho** — protocolo de préstamos: mercados aislados (activo prestado + colateral + oráculo + modelo de tasa + LLTV) y **vaults** ERC-4626 gestionados por *curators*. Twin/DAMM ya tienen mercados con stablecoins LATAM en Morpho.
- **Monarch** — interfaz "power user" sobre Morpho Blue: acceso directo a mercados, prestar/pedir, leverage, **Auto Vaults** con agentes que reasignan capital a la mejor tasa. Sirve para arbitrar tasa entre mercados.
- **Curve Finance** — DEX (AMM) especializado en swaps entre activos con el mismo valor (stablecoins, ej. USDC↔USDT) con muy poco slippage gracias a su fórmula *StableSwap*. También tiene su stablecoin crvUSD y préstamos (LlamaLend). Útil como referencia para un pool ARGt↔otras stables.
- **Chainlink** — red de oráculos: precios (Data Feeds), aleatoriedad (VRF), automatización y **CCIP** (*Cross-Chain Interoperability Protocol*: mover tokens y mensajes entre chains).
- **Smart contract** — programa que vive en la blockchain y se ejecuta solo según reglas.
- **Arbitraje de tasa con ARGt** — aprovechar diferencias de tasa (ej. tasa de préstamo en Morpho vs. caución/plazo fijo/otros mercados) haciendo idas y vueltas para capturar el spread.
- **Hedging on-chain** — cubrir riesgo (ej. devaluación ARS/USD) con posiciones on-chain; el repo CCIP+ICM sirve para aprender a mover posiciones/mensajes entre chains.

---

## 4. Ideas para buildear (ranking)

### 🥇 Idea 1 — "Pagos privados en pesos" con Twin + eERC (la que marcó Sebastián)
**Problema:** en una blockchain pública cualquiera ve cuánto cobrás, cuánto pagás a proveedores, tu saldo. Ninguna empresa paga sueldos así.
**Solución:** wrapper eERC en modo **Converter** sobre ARGt → transferencias con montos/balances encriptados, con **viewing key** para auditor/AFIP y **KYC/KYA con Kumply** para que solo cuentas verificadas puedan usarlo (compliance-friendly, cosa que la CNV mira).
**MVP en 9 h:**
1. Deploy de eERC converter apuntando a ARGt (o a un mock ERC-20 "ARGt" si no hay testnet) en Fuji.
2. Front simple: depositar ARGt → pagar privado → retirar. Mostrar en Snowtrace que el monto no se ve.
3. Gate de KYC con `@kumply/sdk` (o mock).
4. Bonus: caso de uso concreto — **payroll de PyME** o **pago a proveedores**. Bonus 2: endpoint **x402** para que un agente pague privado.
**Versión "grande" (para el pitch/roadmap):** una **Avalanche L1 de pagos** permisionada, con ARGt como token de gas y eERC nativo.
> Dato: el propio Avalanche ya propuso "Shielded Stablecoin Transfers" (stablecoin → eERC converter → pagos P2P confidenciales) como idea de hackathon de privacidad → hay docs y ejemplos.

### 🥈 Idea 2 — On/off-ramp P2P estilo zkP2P (ARS ↔ ARGt)
**Qué es zkP2P** (hoy rebrandeado **Peer**, peer.xyz): on/off-ramp fiat↔cripto **peer-to-peer** sin exchange centralizado. El vendedor deja cripto en un escrow; el comprador paga por Venmo/Revolut/Wise y genera una **prueba de conocimiento cero** de que pagó (originalmente sobre el mail de confirmación con zkEmail) sin exponer datos; el contrato libera los fondos.
**Versión local:** ARS por transferencia/Mercado Pago → ARGt liberado del escrow. Encaja con "banking the unbanked" y con el perfil ZK de WakeUp. Más difícil de terminar en 9 h → MVP con prueba simulada/oráculo.

### 🥉 Idea 3 — Arbitraje / hedging de tasa con ARGt
Agente (track AI) o dashboard que compara tasas de ARGt en Morpho (vía API de Morpho/Monarch) vs. otras referencias, y ejecuta idas y vueltas o rebalancea un vault. Variante: "ahorro en pesos con cobertura" usando oráculo DIA/Chainlink. ⚠️ Cuidar el framing regulatorio (no prometer rendimiento de ARGt).

### Combinaciones con buena narrativa
- Idea 1 + **x402** + **KYA**: "agentes de IA que pagan proveedores en pesos, de forma privada y verificada" → toca 3 tracks (AI, Blockchain, Stablecoins).

---

## 5. Setup rápido (checklist para la mañana)

```bash
# Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Template de buenas prácticas
git clone https://github.com/defi-wonderland/solidity-foundry-boilerplate

# Avalanche MCP en Claude Code (docs, academy, RPCs, ACPs)
claude mcp add avalanche-mcp --transport http https://build.avax.network/api/mcp
```
- [ ] Wallet (Core o MetaMask) en **Fuji** (43113) con AVAX de faucet
- [ ] ARGt de testnet (faucet.chain.link / preguntar a Twin)
- [ ] Repo eERC + SDK (ver links abajo)
- [ ] Repo + slides para la entrega a las **18:00**

---

## 6. Links para aprender / usar

### Evento y Twin
- HackaTwin (Luma): https://luma.com/cudf7cqz
- Twin: https://twin.finance · App: https://app.twin.finance/explore · X: https://x.com/twinfinance_
- Qué es ARGt (Belo): https://help.belo.app/en/articles/12833571-what-is-argt
- Twin + DIA + DAMM (Morpho): https://www.diadata.org/blog/post/twin-finance-damm-capital-latin-american-currencies-onchain
- CNV levanta sanción (contexto): https://www.criptonoticias.com/regulacion/argentina-efecto-medida-belo-twin-stablecoin-argt/

### Avalanche (fuentes oficiales para la hack)
- **Avalanche Builder Hub**: https://build.avax.network (docs, console, faucet, SDKs)
- **Avalanche Academy**: https://build.avax.network/academy
- **Avalanche MCP** (docs para conectarlo al LLM): https://docs.avax.network/docs/tooling/ai-llm/mcp-server — endpoint `https://build.avax.network/api/mcp`
- **eERC docs**: https://docs.avax.network/integrations/encrypted-erc
- **Curso eERC (Academy)**: https://docs.avax.network/academy/blockchain/encrypted-erc/03-encrypted-tokens/01-privacity-eerc
- eERC (AvaCloud): https://avacloud.io/platform/encrypted-erc
- **Curso x402 (Academy)**: https://build.avax.network/academy/blockchain/x402-payment-infrastructure
- Interchain Messaging / Fuji setup: https://build.avax.network/academy/interchain-messaging/03-avalanche-starter-kit/04-networks
- Team1: https://x.com/AvaxTeam1 · Team1 LATAM Telegram: https://t.me/team1_latam

### x402
- https://x402.org · Docs: https://docs.x402.org

### Identidad
- Kumply (repo): https://github.com/Eras256/Kumply (org: https://github.com/KumplyProtocol)

### Dev tools
- Foundry: https://github.com/foundry-rs/foundry · Book: https://book.getfoundry.sh
- Solidity Foundry Boilerplate: https://github.com/defi-wonderland/solidity-foundry-boilerplate
- Snowtrace testnet: https://testnet.snowtrace.io
- Chainlink faucet: https://faucet.chain.link

### Chainlink / cross-chain / hedging
- **Repo CCIP + ICM** (mensaje Sepolia → Fuji vía CCIP, después Fuji → L1 Dispatch vía ICM, con Foundry): https://github.com/bunsdev/ccip-avalanche
- CCIP starter kit (Foundry): https://github.com/smartcontractkit/ccip-starter-kit-foundry
- Docs CCIP: https://docs.chain.link/ccip · CCIP en Avalanche: https://docs.avax.network/integrations/chainlink-ccip

### DeFi
- Morpho: https://app.morpho.org · Docs: https://docs.morpho.org
- Monarch: https://monarch-docs.pages.dev · Repo: https://github.com/antoncoding/monarch
- Curve: https://curve.finance

### Ideas / referentes
- zkP2P / Peer: https://peer.xyz · Docs: https://docs.zkp2p.xyz · GitHub: https://github.com/zkp2p
- WakeUp Labs (empresa del jurado): https://github.com/wakeuplabs

---

## 7. Tips de pitch para este jurado
1. **Demo funcionando en Fuji** > slides lindas. Mostrar el tx en Snowtrace.
2. Hablar el idioma de Sebastián: **liquidez, inclusión financiera, privacidad, ZK**.
3. Usar **ARGt** de verdad (es la hack de Twin) y nombrar Avalanche (eERC/L1) → sumás puntos con ambos sponsors.
4. Mencionar **compliance** (KYC/KYA, viewing keys) como feature, no como problema — le habla directo a Sofía Priore (mentora de compliance web3) y a Twin (post-CNV).
5. Cerrar con roadmap: "hoy en C-Chain/Fuji → mañana L1 de pagos dedicada".
