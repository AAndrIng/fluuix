# Fluuix — Auditoría de seguridad y actualización audit-fix v2

**Fecha de revisión:** 7 de noviembre de 2026.

**Base revisada:** el archivo `fluuix-main.zip` entregado por el usuario.

**Referencia declarada en el comentario del ZIP:** `6db42cb9cca3923d98d11e4f99eada280b06a30f`.

**SHA-256 del ZIP original:** `5d1dd5f7dc3ab31d97f6debf6a4ef591bc47e86429ec677816bf79ccceece2aa`.

**Resultado:** correcciones integradas y verificadas mediante pruebas locales acotadas; pendiente validación integral de despliegue. **No aprobado para producción bancaria ni para fondos reales.**

## 1. Resumen para decidir

Se revisó una copia de 70 archivos, sin historial `.git`, contratos Solidity ni dependencias instaladas. El comentario del ZIP identifica una referencia del repositorio, pero no constituye una comprobación criptográfica del historial de GitHub. El inventario de archivos y sus hashes se incluye en `evidencias/inventario-snapshot.json`.

Esta copia es diferente de la auditada previamente (`f26e0f0…`). Incorpora una API de automatización, una segunda migración SQL, un panel de supervisión, una wallet firmante en el servidor y una integración opcional con un modelo de IA. Por eso ya no es correcto describir todos sus movimientos como firmados manualmente por el usuario.

Se integraron las correcciones anteriores de revocación de sesiones, límites HTTP, origen confiable y cabeceras. Se agregaron defensas acotadas al circuito automático, sin cambiar contratos, dependencias o saldos. La migración de revocación se renumeró a **003** para no interferir con `002_treasury_automation.sql`, incorporada por el equipo.

**Resultado ejecutado: 81 pruebas locales aprobadas, cero fallidas y cero omitidas.** Además, se transpilaron aisladamente 37 archivos TypeScript/TSX sin diagnósticos sintácticos y se verificaron tipos de cuatro módulos puros. Eso no equivale a compilar la aplicación completa.

La instalación completa no pudo completarse: una consulta al registro npm devolvió `EAI_AGAIN` y `npm ci --ignore-scripts --offline` terminó en `ENOTCACHED`. Por lo tanto, **no se ejecutaron el build integral, lint integral, npm audit, el flujo real de navegador/wallet, la migración en Postgres ni transferencias en Fuji**.

## 2. Alcance y método

La fuente del análisis funcional y de los hallazgos es exclusivamente el ZIP recibido y los archivos del parche anterior aportados en la conversación. Las referencias externas se utilizaron para el marco de evaluación, no para inventar funcionalidades del producto.

Se inspeccionaron rutas HTTP, autenticación, revocación, persistencia, preparación y conciliación de movimientos, automatización, modelo de IA, configuración, manifiesto y archivo de bloqueo. Se ejecutaron pruebas sobre copias locales con datos sintéticos. No se usaron credenciales reales, no se consultó una instalación privada, no se firmó en una blockchain ni se movió liquidez.

La búsqueda de secretos se limitó a patrones de claves PEM, tokens GitHub y claves de API literales. No encontró coincidencias en los archivos de entrada. Solo se recibió `.env.example`, sin valores reales. **Esto no demuestra ausencia de secretos en el historial, el despliegue, logs o proveedores externos.**

El ZIP no incluye `.sol`; tampoco acredita un contrato verificado, un token oficial de Twin ni una transacción realizada por esta versión. Se conserva la separación entre mARGt de demostración y una stablecoin oficial. No se declara elegibilidad de los tracks a partir de pruebas simuladas.

## 3. Ingeniería inversa: qué hace hoy

### 3.1 Demostración local

`web/src/components/rail-dashboard.tsx` utiliza `web/src/lib/treasury-rail.ts` para depósitos, transferencias internas, lotes, umbrales y rebalanceos simulados. Los saldos e historial se guardan en `localStorage`. Los importes se representan con enteros `BigInt` de 18 decimales; no se usa punto flotante para el capital.

`web/src/components/treasury-agent.tsx` conserva una simulación de colocación de excedentes con tasas y mercados ficticios. No debe confundirse con la nueva automatización ni presentarse como una integración real con Belo.

### 3.2 Movimiento intercompany manual

`chain-intercompany.tsx` conecta una wallet y pide una firma de acceso. `wallet-session.ts` verifica el desafío y `fuji.ts` comprueba red y rol `TESORERO`. La API registra una intención en Postgres; la wallet del usuario firma la transacción. `intercompany-service.ts` concilia el hash con emisor, destino, datos de llamada, recibo y evento esperado antes de marcar el movimiento como confirmado.

El código contiene consultas parametrizadas, un desafío de un solo uso, HMAC, comparación temporalmente segura, cookies `HttpOnly`/`SameSite`, y control del rol en cada autorización. Estos controles existen y se reconocen. No se informó una inyección SQL ni acceso anónimo a la tesorería sin evidencia.

### 3.3 Automatización añadida

El nuevo circuito vive en `treasury-automation-service.ts` y `/api/intercompany/automatizacion`.

1. Un tesorero autenticado pide evaluar un escenario de actividad. Tráfico y ventas provienen de constantes de demostración, no de un ERP o de mediciones verificadas.
2. La aplicación lee las operativas de Fuji. Palermo tiene el ID fijo `1`.
3. El umbral fijo es 0,25 mARGt. En pitch se simula un umbral preventivo; en modo normal se puede consultar el modelo para estimar un valor entre 25 y 100 centésimos.
4. La política de código elige la fuente, conserva reservas configuradas, limita el préstamo a 2 mARGt y propone una tasa contable de 500 puntos básicos, equivalente al 5% TNA. Esa tasa no implementa cobro de intereses.
5. Se guarda una propuesta programada con ventana de veto. Después del parche, la ventana normal sigue siendo de 180 segundos; la de pitch de cinco segundos exige autorización expresa del servidor.
6. La pestaña abierta solicita avanzar la ejecución. El servidor revalida, firma mediante `TREASURY_AUTOMATION_PRIVATE_KEY`, persiste los bytes firmados y el hash y solicita la emisión al RPC.
7. La conciliación marca confirmado/revertido. Al finalizar se eliminan de ese registro los bytes firmados.

**No hay un trabajador autónomo duradero demostrado:** el panel avisa que debe mantenerse abierto. No corresponde prometer procesamiento ininterrumpido 24/7 con esta implementación.

### 3.4 Límites de confianza

| Frontera | Qué atraviesa | Qué existe / qué falta |
|---|---|---|
| Navegador → API | Cookies, JSON, intención del tesorero | Sesión y rol; parche de límites y origen. No se demostró identidad civil ni representación societaria. |
| API → Postgres | Intenciones, condiciones comerciales, estados y revocaciones | SQL parametrizado y esquema con RLS. Faltan permisos efectivos, TLS y pruebas reales del entorno. |
| API → modelo | Actividad de demo y saldo en unidades mínimas | Respuesta estructurada y validación numérica. No sustituye debida diligencia del proveedor. |
| API → wallet automática | Solicitud de firma | Clave de servidor y controles de aplicación. Sin evidencia de firmador aislado, límites onchain o doble aprobación. |
| API → RPC / contrato | Transacción firmada, consultas y recibos | Integración en código para Fuji. Contrato fuente, despliegue y comportamiento real no verificados. |

El modelo estima un umbral; no recibe una clave privada ni selecciona directamente calldata. La solicitud incluye `store: false`, pero ese parámetro no acredita por sí solo un acuerdo contractual de retención, confidencialidad o residencia de datos.

## 4. Hallazgos y tratamiento

La severidad es cualitativa y depende de la exposición real. No se asignó un CVSS sin un escenario y una configuración verificables. Una prueba fallida no equivale a una vulnerabilidad independiente.

### AF-01 — Una copia de la sesión sobrevivía al cierre

**Clase:** defecto confirmado en laboratorio. **Severidad:** media, con impacto potencial mayor si habilita un circuito de firma automática. **Estado:** corregido localmente; despliegue pendiente.

**Evidencia original:** `web/src/lib/server/wallet-session.ts`, función `closeSession`. Solo borraba la cookie; `authorize` aceptaba la copia autenticada hasta su vencimiento. La duración definida era 1800 segundos.

**Prueba:** un token sintético válido se reutilizó tras el cierre. En la versión corregida se registra su nonce en Postgres y cada autorización consulta su revocación.

**Alcance real:** no se demostró robo de cookies. La reproducción presupone disponer de una copia. El circuito manual sigue requiriendo la firma de la wallet; el nuevo circuito automático puede iniciar acciones con una sesión autorizada y una clave del servidor. No deben confundirse ambos casos.

**Residual:** revocar una sesión no cancela propuestas ya programadas ni una transacción previamente emitida. Tampoco se implementó cierre global de todas las sesiones de una persona. Las comprobaciones de concurrencia y persistencia real de revocación siguen pendientes.

### AF-02 — Límite de cuerpo aplicado después de leerlo

**Clase:** defecto confirmado en laboratorio. **Severidad:** media, condicionada por el proxy y hosting. **Estado:** corregido localmente.

**Evidencia original:** `web/src/lib/server/http.ts`, función `readJson`: `request.text()` precedía al control de longitud. Se medían caracteres, no bytes.

**Corrección:** lectura incremental con máximo de 8192 bytes, cancelación, tiempo máximo de cinco segundos, validación UTF-8 y rechazo de compresión no admitida. Las pruebas incluyen lectura fragmentada, contenido multibyte y un emisor que no entrega datos.

**Residual:** no equivale a protección contra DDoS o agotamiento de conexiones. Sigue faltando probar límites de frecuencia y concurrencia en el entorno real. Un proxy puede consumir recursos antes de entregar el cuerpo a la aplicación.

### AF-03 — Origen confiable y cabeceras

**Clase:** endurecimiento preventivo, no explotación demostrada. **Estado:** integrado.

`APP_ORIGIN` es obligatorio y HTTPS en producción; HTTP solo se admite en loopback durante desarrollo. Los POST de esta API con cookies requieren `Origin` exacto. Se incorporan protección contra embedding, `nosniff`, política de referente y restricciones de permisos.

La CSP añadida **no restringe scripts** y no debe presentarse como una solución completa contra XSS. Requiere una etapa de nonces, hidratación y pruebas de navegador. Clientes de API que antes omitían `Origin` deben adaptarse: el encabezado no sustituye autenticación ni convierte esta API de sesión de navegador en una API bancaria máquina-a-máquina.

### AF-04 — Ventana de pitch seleccionable sin autorización separada

**Clase:** decisión de diseño de la demo; endurecimiento recomendado antes de ampliar el uso. No se considera un bypass anónimo. **Estado:** integrado.

Antes, un tesorero con acceso al vault habilitado podía elegir `mode=demo`, reduciendo la ventana de veto a cinco segundos. Ahora el servidor exige `TREASURY_AUTOMATION_ALLOW_DEMO=true`. El valor predeterminado del panel es normal y el servidor vuelve a verificar la autorización antes de firmar o retransmitir propuestas de pitch ya persistidas.

Desactivar el flag no retira transacciones ya publicadas. Una transacción confirmada puede seguir conciliándose. Una propuesta de pitch pendiente puede quedar bloqueada después de retirar el flag; no se elimina ni se reescribe automáticamente. Debe resolverse bajo control del operador, sin manipular saldos.

### AF-05 — Revalidación incompleta de datos persistidos

**Clase:** debilidad de defensa en profundidad confirmada con estados sintéticos. **Severidad:** baja/condicionada. **Estado:** integrado.

La función `proposalStillValid` se apoyaba en tipos TypeScript y comparaciones de saldo. Aceptaba ciertos datos fuera de la política, como importe cero o negativo, tasa cambiada o destino distinto. Esto **no demuestra que una persona anónima pueda escribir en la base**, ni que Solidity acepte transferir un importe negativo: la codificación uint o el contrato podrían rechazarlo posteriormente.

El parche valida un importe positivo canónico, cap de 2 tokens, tasa fija, destino Palermo, fuente distinta, IDs seguros, saldo y reservas no negativos, unicidad de cuentas y umbral permitido. El servicio también verifica que los bytes que va a emitir coincidan con el hash persistido.

**Residual:** la comparación de hash detecta discrepancias; no protege frente a un atacante que controle la base y reescriba todos los campos coherentemente. No es una validación completa del contenido de la transacción firmada ni un reemplazo de custodia segura.

### Brechas de mayor prioridad que este parche NO cierra

| ID | Brecha observada o evidencia faltante | Consecuencia para aceptar producción |
|---|---|---|
| BP-01 | No hay fuentes Solidity ni artefactos verificables del despliegue en el ZIP. | No se puede dictaminar seguridad del vault, privilegios ni idempotencia onchain. |
| BP-02 | Firma automática mediante una clave en variables del servidor. | Requiere diseño de custodia, rotación, segregación y límites independientes de la aplicación. |
| BP-03 | Reservas demostradas en el código de aplicación; la documentación indica que el contrato valida saldo, no esa política. | Revisar carrera entre lectura y ejecución y demostrar imposición de límites en el contrato/firmador. No asumir que una simulación reserva fondos. |
| BP-04 | Calldata con referencia `FLX:<uuid>`; tasa, tipo y nota en Postgres. | El comprobante de transferencia no acredita todas las condiciones del préstamo. Diseñar evidencia íntegra de condiciones y aprobaciones. |
| BP-05 | Ejecución y reintentos impulsados por una pestaña; falta prueba de worker/cola durable. | No aprobar disponibilidad, recuperación ni operación desatendida. |
| BP-06 | Sin prueba integral de infraestructura, dependencias, migraciones y credenciales de producción. | No aprobar el despliegue por el solo resultado de pruebas aisladas. |
| BP-07 | No se demuestra KYC/KYB operativo, identificación del representante ni segregación de funciones institucional. | El rol de wallet no reemplaza esos controles; el texto comercial no es evidencia de implementación. |

La documentación comercial menciona beneficios bancarios/impositivos y KYC/KYB. La revisión no acredita esas afirmaciones. No se modificó el modelo fiscal ni se concluyó que usar stablecoins cree una exención. Tampoco se declaró IDOR por el acceso de dos tesoreros a un mismo vault: la autorización grupal existente debe evaluarse contra la política empresarial acordada.

## 5. Pruebas efectivamente ejecutadas

| Batería | Original: aprobadas / fallidas / omitidas | Corregido: aprobadas / fallidas / omitidas |
|---|---|---|
| Funciones de tesorería y automatización existentes | 17 / 0 / 0 | 17 / 0 / 0 |
| HTTP y sesiones | 14 / 18 / 3 | 35 / 0 / 0 |
| Revalidación y recorrido automático | 12 / 17 / 0 | 29 / 0 / 0 |
| **Total de casos** | **43 / 35 / 3** | **81 / 0 / 0** |

Los casos nuevos también expresan políticas más estrictas: sus fallos contra el original no son 35 vulnerabilidades ni 35 ataques demostrados.

**Entorno:** Node.js 22.16.0. Las pruebas de dominio utilizan el soporte de eliminación de tipos de Node. Los arneses de servidor utilizan TypeScript **5.8.3 disponible localmente**, solo como transpilador. El archivo de bloqueo del proyecto fija TypeScript **5.9.3**, que no pudo instalarse; no se sustituyó esa versión en el repositorio. La diferencia debe cerrarse con `npm ci` y CI antes del merge.

**Qué es real en las pruebas:** código fuente de los módulos revisados, parser de importes, comparación de políticas, lectura de streams HTTP, temporización local, HMAC y verificación de integridad del parche.

**Qué está simulado:** NextResponse, Postgres, verificación de firma de wallet, RPC, emisión, conciliación del nuevo circuito y hash Ethereum en el arnés de automatización. En ese arnés se usa un hash sintético para verificar la lógica de igualdad, no la criptografía de viem. Las pruebas existentes del modelo interceptan `fetch`; no hubo llamada a una API real.

**Comprobaciones adicionales:** 37 archivos transpilados aisladamente; tipos comprobados en `treasury-automation.ts`, `treasury-rail.ts`, `intercompany.ts` y `request-guards.ts`. No se atribuye cobertura integral de tipos, SSR, hidratación, SQL ni concurrencia a esos resultados.

El archivo `package-lock.json` no se modificó. Los bloques de dependencias y devDependencies siguen coincidiendo con el manifiesto. Se añadieron comandos `npm test`, `npm run typecheck` y `npm run check`; el workflow no desplegó ni se ejecutó en GitHub durante esta revisión.

## 6. Marco bancario: referencias y límites

Se contrastó el marco argentino con el texto ordenado oficial del BCRA consultado el 7/11/2026: **13/02/2026, última comunicación incorporada A 8401**. Su sección 1.1 incluye entidades financieras, determinadas infraestructuras de mercado y PSP registrados. El ZIP no permite determinar si Fluuix es sujeto obligado; esa aplicabilidad exige análisis jurídico y del servicio concreto. [R1]

Las referencias de gestión son **ISO/IEC 27001:2022**, su **Amd 1:2024** y **ISO/IEC 27002:2022**, corroboradas en ISO. Se usan como marco, no como certificación ni como supuesto acceso al texto normativo íntegro. [R2–R4]

**OWASP ASVS 5.0.0** se utiliza como catálogo técnico. No se declara conformidad con un nivel completo: no se ejecutó la totalidad de requisitos. [R5]

La siguiente matriz es una propuesta de trabajo del auditor, no una declaración de cumplimiento de los reguladores:

| Área de referencia | Aplicación propuesta para Fluuix | Estado de evidencia | Responsable sugerido |
|---|---|---|---|
| BCRA 2.2; gestión de roles ISO | Separar quien solicita, aprueba, administra claves y despliega. | No demostrado institucionalmente. | Gobierno/CISO |
| BCRA 4.6; evaluación de IA | Identificar datos reales frente a simulados y validar decisiones del modelo. | Límites numéricos presentes; gobierno pendiente. | Producto + Riesgos |
| BCRA 5.7; ASVS sesiones/autorización | Revocación, rol, autenticación reforzada y baja de accesos. | Pruebas aisladas; integración pendiente. | Backend + IAM |
| BCRA 6 y 7.6 | Recuperación de operaciones y restauración verificable. | No demostrado. | Operaciones |
| BCRA 8 | Detección, respuesta e investigación con evidencia. | No demostrado. | CISO + Operaciones |
| BCRA 9; ASVS validación/configuración | Pruebas, revisión de cambios y dependencias. | Paquete y workflow; ejecución integral pendiente. | Desarrollo + QA |
| BCRA 10 | Evaluar RPC, hosting, base y proveedor de IA. | Inventario funcional parcial, acuerdos no revisados. | Riesgos + Legal |

No se informa un “porcentaje de compliance”: promediar un parser probado con una custodia no verificada produciría una calificación engañosa.

## 7. Entrega, aceptación y publicación

El ZIP corregido contiene el repositorio completo del snapshot, cambios audit-fix, documentación en castellano y evidencias. Se entrega además un parche para aplicar en una rama, no sobre `main` sin revisión. No se incluyen `.git`, `node_modules`, claves ni configuraciones privadas.

La guía `APLICACION-Y-VALIDACION.md` explica migraciones, configuración, prueba de sesión, prueba del circuito manual, veto automático, comprobación de reservas y reversión segura. `PR-audit-fix.md` contiene el texto propuesto para un PR de borrador.

**Condición de salida:** revisar la rama, instalar desde el lock, pasar las verificaciones integrales, aplicar 003 en staging y demostrar un cierre de sesión revocado y una operación real de Fuji con comprobante. No conectar la liquidez real como sustituto de estas verificaciones.

El ZIP no concede permisos a la integración de GitHub. Esta entrega no publica un PR, no modifica `main` y no es un despliegue. Tampoco presupone control remoto de la laptop del usuario.

## Referencias externas consultadas

- **[R1] BCRA:** Requisitos mínimos para la gestión y control de los riesgos de tecnología y seguridad de la información. Texto ordenado al 13/02/2026, A 8401. Se verificaron portada y sujetos obligados visualmente, además del índice: https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-rmgcti.pdf
- **[R2] ISO:** ficha oficial ISO/IEC 27001:2022: https://www.iso.org/standard/27001
- **[R3] ISO:** ficha oficial ISO/IEC 27001:2022/Amd 1:2024: https://www.iso.org/standard/88435.html
- **[R4] ISO:** ficha oficial ISO/IEC 27002:2022: https://www.iso.org/standard/75652.html
- **[R5] OWASP:** ASVS y descargas de la versión estable 5.0.0: https://asvs.owasp.org/ y https://asvs.owasp.org/downloads/

**Lectura del dictamen:** “corregido localmente” significa que existe código y pruebas acotadas; “pendiente” significa que falta evidencia. Ninguno de esos términos equivale a certificación bancaria, autorización regulatoria o garantía de ausencia de vulnerabilidades.
