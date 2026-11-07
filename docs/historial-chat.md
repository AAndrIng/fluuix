# Historial de la conversación de preparación (7/11/2026)

Resumen en orden de todo lo que se habló con Claude antes y durante la HackaTwin.

## 1. Machete del evento (madrugada)
Berni volvió del evento previo "Recreo", donde conoció a la gente de Twin y de Team1, y pidió un machete. Lo que trajo de la charla:
- **Twin:** stablecoins locales (ARGt). **Avalanche:** plataforma para construir blockchains. **Team1:** el lado comunidad de Avalanche.
- **Personas:** Sofía Priore (líder de Team1 LATAM), Cande Font (marketing de Twin, muy técnica) y **Sebastián Luján, jurado** (dev en WakeUp Labs y en el mundo Twin).
- **Temas de la charla:** inclusión financiera de los no bancarizados, ser proveedor de liquidez, mecanismos de inversión que antes eran solo para grandes, préstamos con tasas bajas, x402 (pagos por HTTP para APIs y agentes), Kumply (identidad y compliance), KYC/KYA, pagos agénticos, L1 como chain de pagos.
- **Herramientas:** Foundry, Fuji y Snowtrace, ARGt de testnet en faucet.chain.link, Avalanche Builder Hub, Avalanche MCP, Avalanche Academy y el repo Solidity Foundry Boilerplate (referencia de buenas prácticas para trabajar con LLMs).
- **Oportunidades mencionadas:** arbitraje de tasa con ARGt, hedging, Morpho, Monarch, Curve, Chainlink y el repo CCIP + ICM para aprender a cubrir riesgo.
- **Idea que Sebastián marcó como ganadora:** pagos privados con Twin. También se mencionó zkP2P (on/off-ramp P2P con pruebas ZK, hoy llamado Peer).
→ Todo está desarrollado en `context/machete-hackatwin.md`.

## 2. Hallazgos de la investigación
- El evento es **HackaTwin**: sábado 7/11, Digital House, de 8:00 a 21:00. Entrega a las 18:00. Tracks: AI, Blockchain, Fintech y Stablecoins. Equipos de hasta 4.
- **Sponsors:** Twin, BitGo, Digital House, Belo, Tether y Team1 Avalanche.
- **Twin:** antes se llamaba Num Finance y tiene sede en Uruguay. Emite 7 stablecoins locales. La CNV la sancionó en marzo de 2026 por promocionar ARGt con rendimiento y levantó la sanción en abril, cuando ARGt quedó como medio de pago. Trabaja con DIA (oráculos) y DAMM Capital (mercados en Morpho).
- **eERC (Encrypted ERC):** el estándar de token confidencial de Avalanche. Su modo Converter puede envolver ARGt para hacer pagos privados.
- **Sofía Priore:** @Sofpriore en X, cofundadora de GO LATAM, CMO de Buckspay, miembro de Team1. Fue mentora de compliance en la Hackathon LatAm Institucional de Avalanche.
- **Cande Font:** no se encontró un perfil público confirmado. Posible usuario en X: @f0ntzz (sin confirmar).

## 3. Rol de Berni: GTM
Berni es el GTM del equipo: no es técnico, pero tiene que hablar el idioma y manejar la estrategia, el modelo de negocio y la llegada a mercado, que es un criterio clave del jurado.
→ Los conceptos (gas, Foundry, ZK, financiamiento, monetización, escalado) están en `context/gtm-conceptos.md`.

## 4. Definición del proyecto (10:08)
- **Nombre:** Fluuix. **Producto:** Treasury Rail, tesorería blockchain para empresas.
- **Track:** Stablecoins como principal, AI como secundario.
→ El documento oficial está en `docs/fluuix-treasury-rail.md` y las notas internas y riesgos en `context/estrategia-interna.md`.

## 5. Entregables generados
- `docs/fluuix-treasury-rail.md`: problema, solución, cliente, GTM y modelo de negocio.
- `docs/resumen-500.md`: resumen de 469 caracteres para el formulario.
- `README.md` y la estructura del repo (`contracts/`, `app/`, `docs/`, `context/`).

## 6. Estado del repo
- Este Claude no pudo crear el repo en GitHub ni escribir en la carpeta local de Berni.
- Se encontró **`Hextalin/fluuix`** (público, con actividad reciente), posiblemente el repo del equipo, pero falta confirmarlo.
- Carpeta local de trabajo: `/home/berni/Desktop/Dev/Hackatwin-fluuix`.

## 7. Próximos pasos sugeridos
1. Construir el MVP de la demo (ver "MVP sugerido" en `CLAUDE.md`).
2. Armar el guion del pitch de 3 minutos a partir de `docs/fluuix-treasury-rail.md`.
3. Preparar las respuestas a los riesgos de `context/estrategia-interna.md`.
4. Entregar antes de las 18:00 con el repo y las slides.
