# Fluuix — Treasury Rail

> **Tesorería on-chain para empresas y holdings de LATAM.** Toda la caja del grupo en un solo lugar, en stablecoins de moneda local, con liquidez instantánea entre operativas y entre países, préstamos intercompany automatizados y documentados, pagos a proveedores, operaciones financieras 24/7 y un agente de IA que optimiza la caja. Se usa desde una interfaz o por API (headless), conectado al ERP de la empresa.

- **Empresa:** Fluuix
- **Producto:** Treasury Rail
- **Infraestructura:** stablecoins en moneda local de Twin (ARGt y sus equivalentes en otras monedas de LATAM) sobre Avalanche

---

## 1. El problema

**Para las empresas y los holdings**
- **Caja fragmentada.** Los grupos con varias razones sociales u operativas tienen la plata repartida en distintas cuentas, bancos y países. Una operativa puede quedarse sin caja mientras otra tiene de sobra, y equilibrarlas es lento, caro y manual.
- **El intercompany es ineficiente.** Mover plata entre sociedades del grupo exige préstamos o aportes que hay que documentar, calcular (capital e interés) y registrar uno por uno. Si la subsidiaria está en otro país (por ejemplo, en Chile), además hay conversión de moneda, bancos corresponsales y días de espera para liquidar.
- **Mover plata cuesta caro.** Cada movimiento bancario paga comisiones e impuestos, y un mismo peso que pasa por varias cuentas del grupo los paga varias veces.
- **Sin visión 360.** La liquidez, las inversiones y el flujo de caja futuro están repartidos en bancos, ALyCs y planillas. Optimizar la caja es manual y nadie mira el historial para aprender de él.
- **Horario bancario.** El mercado tradicional cierra: la plata ociosa de la noche, los fines de semana y los feriados no trabaja.
- **Acceso desigual.** Tomar crédito con garantía o dar liquidez a instituciones queda reservado para jugadores con mucho capital e influencia.

**Para los consumidores finales**
- Las comisiones bancarias y los impuestos que se acumulan en cada transferencia **terminan en el precio final**.

---

## 2. La solución: Treasury Rail

Una plataforma de tesorería en la que la caja de la empresa está respaldada, parcial o totalmente, por stablecoins en moneda local (por ejemplo, ARGt = 1 peso argentino).

| Módulo | Qué hace |
|---|---|
| **Caja tokenizada multimoneda** | La liquidez del grupo se mantiene en stablecoins de moneda local (ARGt y sus equivalentes para cada país de LATAM donde opera el grupo), sin exposición cambiaria obligatoria a dólares. |
| **Tesorería omnicanal** | Una sola tesorería para todas las operativas y razones sociales del grupo. Transferencias instantáneas y rebalanceo automático para que **ninguna operativa tenga un hueco de caja**. |
| **Intercompany automatizado** | Cada movimiento entre sociedades se instrumenta solo como préstamo o aporte: el contrato marco se firma una vez, cada transferencia genera su registro de capital e interés y todo queda trazable on-chain. La liquidación entre países es inmediata, sin pasar por el banco. |
| **Pagos y comercio exterior** | Pagos a proveedores en segundos, con costo de red de ~US$0.001 por operación en Avalanche. En importaciones y exportaciones, el pago y su conversión a la moneda de destino quedan registrados con un resumen listo para contabilidad. |
| **Operaciones financieras 24/7** | La caja ociosa puede colocarse en mercados on-chain (préstamos, provisión de liquidez) y la empresa puede tomar crédito con la caja como garantía, a cualquier hora, incluso con el mercado tradicional cerrado. |
| **Agente de tesorería con IA** | La empresa define sus límites de riesgo, las tasas objetivo y los mercados habilitados. El agente busca la mejor tasa, coloca la caja dentro de esos límites y analiza el historial de la empresa (incluso el importado de otras plataformas) para sugerir cómo optimizar la caja. |
| **Flujo de caja predictivo y registro contable** | Las operaciones quedan registradas on-chain y alimentan una proyección del cash flow y una vista 360 del capital líquido y del invertido. Fluuix **no es un ERP**: es la fuente de datos de caja y transacciones que alimenta al ERP de la empresa (SAP u otro). |

**Cómo se usa:** con la interfaz web o en modo headless, por API, integrado a los sistemas que la empresa ya tiene.

**Principio de diseño:** la tecnología como habilitadora. La empresa hace lo mismo que ya hacía (pagar, cobrar, invertir, mover caja entre sociedades), pero más rápido, más barato, documentado automáticamente y sin tener que entender blockchain.

---

## 3. Marco legal y compliance

- **En Argentina mover caja entre sociedades del grupo es legal**, siempre que esté documentado como préstamo o aporte. Fluuix automatiza esa documentación: un contrato marco firmado una vez y un registro por cada movimiento, con capital e interés. Para grupos con mucho movimiento interno se puede usar una estructura de fideicomiso.
- **Todo queda registrado y es auditable**, con KYC/KYB de las empresas. El compliance es parte del producto, no un obstáculo.
- **Los rendimientos vienen de colocar la caja en protocolos on-chain**, nunca de la stablecoin en sí.
- **Los costos bancarios e impositivos se pagan al entrar y al salir del sistema**, no en cada movimiento interno.
- El tratamiento contable e impositivo se trabaja junto al contador de cada cliente, y cada país se adapta a su propia regulación.

---

## 4. El cliente

**Cliente ideal (beachhead):** **holdings y grupos PyME o medianos con varias razones sociales u operativas**, en Argentina y con subsidiarias en otros países de LATAM. Por ejemplo, grupos gastronómicos, cadenas de retail, distribuidoras, importadores y exportadores.
- Es donde más duele: más sociedades y más países implican más movimientos intercompany, más caja fragmentada y más costos.

**Quién decide:** el CFO, el tesorero o el dueño, junto con su contador.

**Quién se beneficia también:** los proveedores, que cobran más rápido y con menos fricción.

**Expansión:**
1. Empresas medianas de una sola razón social con muchos pagos a proveedores o con comercio exterior.
2. Grupos con operaciones en varios países de LATAM, usando las stablecoins de Twin en cada moneda local.

---

## 5. Estrategia go-to-market

**Fase 1: pilotos (0–6 meses)**
- De 5 a 10 grupos empresarios con dolor claro, idealmente que ya tengan contacto con cripto o con Belo.
- Propuesta de entrada simple: "centralizá la caja de todas tus sociedades y movela al instante, con el intercompany documentado solo". Se mide en tiempo de liquidación y en costos evitados por mes.
- Onboarding asistido (white-glove), de la mano del contador del cliente.

**Canales**
- **Partners del ecosistema:** Twin (emisor de las stablecoins) y Belo (puerta de entrada y salida entre moneda local y stablecoins para empresas). Ya tienen usuarios.
- **Estudios contables y asesores impositivos:** son quienes recomiendan herramientas de tesorería a las empresas. Programa de referidos o revenue share.
- **Cámaras y comunidades:** cámaras PyME, de comercio exterior y fintech.
- **Contenido con calculadora:** "¿cuánto te cuesta mover tu caja entre sociedades hoy?".

**Fase 2: producto autoservicio e integraciones (6–18 meses)**
- Alta online y API pública para operar en modo headless.
- Integraciones con ERPs (SAP y sistemas contables locales).
- Agente de tesorería con IA y flujo de caja predictivo como funciones premium.

**Fase 3: regionalización**
- Mismo producto en otros países con las stablecoins locales de Twin, con intercompany entre países como diferencial.

**Por qué ganamos**
- Lo vendemos como **control y velocidad de caja**, no como "blockchain". El cliente no necesita entender la tecnología.
- No competimos con los ERPs: los alimentamos.
- La infraestructura ya existe: Twin pone las stablecoins y Avalanche la red. Nosotros ponemos el producto de tesorería.
- Efecto de red: cuantas más empresas y proveedores operan en la red, más pagos se liquidan al instante y sin costo bancario.

---

## 6. Modelo de negocio

| Fuente de ingreso | Cómo funciona |
|---|---|
| **Suscripción SaaS** | Abono mensual por razón social u operativa conectada, con planes según volumen. |
| **Fee por operación** | Unos puntos básicos por cada pago o movimiento intercompany. Siempre por debajo del costo bancario que reemplaza. |
| **Fee de rampa** | Margen sobre la entrada y la salida entre moneda local y stablecoins, compartido con el partner de rampa. |
| **Performance o gestión** | Un porcentaje sobre el rendimiento que generan las colocaciones on-chain de la caja ociosa. |
| **Premium** | Agente de tesorería con IA, flujo de caja predictivo, reportes contables e impositivos, API e integraciones con ERP, multi-país. |

**Métricas clave:** volumen mensual procesado, caja administrada (AUM de tesorería), cantidad de razones sociales conectadas, costos evitados por cliente y retención.

---

## 7. Demo de la hackathon

- **Avalanche:** contratos en Fuji testnet, con las transacciones visibles en Snowtrace durante la demo, más un bridge hacia Avalanche.
- **Twin:** la caja del grupo en ARGt.
- **IA:** un agente que opera sobre la API de Fluuix con los límites de riesgo que define la empresa y busca la mejor tasa. La integración con Belo (MCP) todavía no está disponible, así que en la demo se simula.

---

## Pitch en una frase
**"Fluuix convierte la tesorería de un grupo empresario en una sola caja en stablecoins de moneda local: instantánea entre sociedades y entre países, con el intercompany documentado solo y un agente que pone la caja a trabajar las 24 horas."**
