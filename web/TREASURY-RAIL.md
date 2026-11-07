# Fluuix · Treasury Rail

Primera web de producto y demo local inspirada en el TreasuryVault.sol suministrado. Se conserva el proyecto existente en `web/`; no se migró a la carpeta `app/` mencionada por el nuevo documento para no romper el checkout actual. En Vercel, usar `web` como Root Directory.

## Ejecutar

```powershell
npm install
npm run dev
```

Rutas: `/`, `/dashboard`, `/mover`, `/pagos`, `/operativas`, `/depositar`, `/agente`. `/app` conserva el acceso anterior al dashboard; `/comparar` explica que la privacidad pasa al roadmap.

## Guion de demo

1. La caja central comienza con 10.000.000 ARGt simulados; las tres operativas, en cero. Hay otros 10.000.000 disponibles en la wallet de prueba para depositar.
2. Rebalancear todo distribuye 3.000.000 a Palermo, 2.000.000 a Belgrano y 1.000.000 a Distribuidora. Quedan 4.000.000 en la central.
3. Mover 500.000 de Palermo a Distribuidora como préstamo al 12% TNA. El registro muestra capital y condiciones; la tasa se guarda como dato y no devenga intereses en la demo.
4. Pagar desde Palermo el lote de tres proveedores de 600.000 cada uno. El saldo baja a 700.000, bajo el mínimo de 1.000.000; se reponen 2.300.000 desde la central hasta el objetivo de 3.000.000.
5. Volver al dashboard: caja total 8.200.000, total pagado 1.800.000 y volumen interno 8.800.000.
6. Revisar el detalle de pagos y exportar movimientos. Se puede importar CSV, crear operativas y editar umbrales.
7. En Agente de tesorería, evaluar mercados con la política inicial. Cambiar la tasa objetivo o el riesgo y revisar el log. Los mercados, las tasas y Belo son simulados.

En modo `mock`, la persistencia es localStorage y Reiniciar vuelve al escenario inicial. El registro de demo usa referencias locales. El agente evalúa reglas con tasas y mercados simulados.

## Correspondencia con TreasuryVault

Los montos usan BigInt de 18 decimales, serializados como string. `src/lib/treasury-rail.ts` modela depósitos, transferencias internas, pagos/lotes, umbrales y rebalanceo. La reposición ocurre si saldo < mínimo; está limitada por la caja central y sigue el orden de IDs. Un pago requiere fondos suficientes antes de ejecutarse y repone solo después del lote completo. Una transferencia interna no dispara reposición. La caja central no se rebalancea a sí misma.

El simulador exige nombre, wallet válida no nula y monto positivo para cada destinatario; son validaciones de UI adicionales. No reemplaza el contrato ni demuestra su seguridad. El faucet local no modela el cooldown del token real.

## Cálculo comercial

La calculadora usa volumen interno × 1,2% como escenario bruto de referencia bancaria. No determina que una transferencia con stablecoins esté exenta, ni calcula ahorro fiscal neto, comisiones, rampas, exenciones o pagos a cuenta. Fuente: artículo 7 del Decreto 380/2001, biblioteca ARCA. La aplicación enlaza la fuente y describe estos límites.

Privacidad eERC, KYB e inversión vía protocolos quedan en el roadmap. El flujo predictivo en Fuji usa señales operativas de demo.

## Verificación

```powershell
node --experimental-strip-types --test scripts/treasury-rail.test.mjs
npx tsc --noEmit
npm run build
```

## Activar intercompany en Avalanche Fuji

La interfaz y la API de Next.js salen del mismo deploy en Vercel, con Root Directory `web`. Supabase aloja Postgres. El contrato y los saldos viven en Avalanche Fuji.

### 1. Conseguí los tres datos de Fuji

El contexto de Treasury Rail trae el RPC, el chain ID `43113`, el código de `MockARGt.sol` en la sección 6.4 y el de `TreasuryVault.sol` en la 6.5. La sección 11 tiene los campos del despliegue vacíos. El PDF de Twin menciona Avalanche y especifica 18 decimales, pero la tabla de contratos se corta en la página 2 y no confirma un ARGt en Fuji. La [lista pública de contratos de Twin](https://docs.twin.finance/en/stablecoins/contracts) tampoco lista Fuji.

| Dato | De dónde sacarlo |
| --- | --- |
| `NEXT_PUBLIC_VAULT_ADDRESS` | Dirección del contrato creado en la transacción de despliegue de `TreasuryVault`, en Fuji. |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Dirección que devuelve `token()` en ese vault. Tiene que ser el ERC-20 con el que se desplegó y devolver `18` en `decimals()`. |
| `NEXT_PUBLIC_VAULT_DEPLOY_BLOCK` | Número de bloque decimal de la transacción que **creó el vault**. Abrí el hash del despliegue en el explorador y copiá el campo **Block**. |

Si el equipo ya desplegó el vault, pedile **el enlace a la transacción de creación en Fuji y la wallet que tiene el rol `TESORERO`**. El enlace te permite recuperar la dirección y el bloque, y `token()` te da el token. La dirección de un vault de Morpho, un pool o un token de otra red no corresponde a estos campos.

### 2. Dejá el vault listo para mover caja

Configurá la wallet con **Avalanche Fuji C-Chain**, chain ID **43113**, RPC `https://api.avax-test.network/ext/bc/C/rpc` y moneda de gas **AVAX**. Conseguí AVAX de prueba para la wallet que va a firmar. El AVAX paga gas y el ERC-20 es el saldo que mueve Fluuix. [Red y faucet oficiales de Avalanche](https://docs.avax.network/docs/primary-network)

Si todavía no hay despliegue, usá [Remix](https://remix.ethereum.org/) con los contratos suministrados:

1. Pedí a los mentores de Twin la **dirección del ARGt de Fuji y tokens de prueba** si están disponibles. Si no los conseguís, desplegá primero `MockARGt` del contexto para probar el flujo en Fuji. Es un token de prueba y la consigna de Twin pide una stablecoin oficial de Twin para competir en su track.
2. Compilá `TreasuryVault.sol` con un compilador compatible con sus imports de OpenZeppelin, con **EVM Version `cancun`**. En **Deploy & Run**, seleccioná la extensión de wallet, confirmá que marque Fuji y desplegá `TreasuryVault` con `_token` igual a la dirección del ERC-20 elegido y `nombreCajaCentral` igual a `Caja central`. El vault queda ligado a ese token desde el constructor.
3. Guardá las direcciones, el hash del despliegue y los ajustes de compilación. Para el track Blockchain, verificá el vault en el explorador con el mismo código, compilador, optimización y versión EVM. [Deploy en Remix](https://remix-ide.readthedocs.io/en/latest/run.html) · [Verificación en Avalanche](https://build.avax.network/docs/tooling/contract-verification)

Si el vault está vacío, preparalo una sola vez desde **Deployed Contracts** en Remix. Para un contrato que ya desplegó otra persona, cargá su dirección con la ABI compilada mediante **At Address** y usá la wallet con rol de tesorero. La wallet que desplegó el vault suministrado recibe ese rol en el constructor.

| Dónde | Qué ejecutar |
| --- | --- |
| Vault | Llamá `verOperativas()`. Si solo aparece Caja central, llamá `crearOperativa("Local Palermo", 0, 0)`. Caja central es el ID `0` y la primera operativa nueva es el `1`. |
| Token | Confirmá que la wallet tenga saldo con `balanceOf(wallet)`. Para un depósito de **10 tokens**, llamá `approve(DIRECCION_DEL_VAULT, 10000000000000000000)`. |
| Vault | Llamá `depositar(0, 10000000000000000000)`. Volvé a `verOperativas()` y comprobá que Caja central tenga 10 tokens, si arrancó en cero. |

Si ya hay dos operativas activas y una tiene saldo, podés pasar directo a configurar la app. En `/mover` los importes se escriben en unidades de token, por ejemplo `1`.

### 3. Creá la base en Supabase

1. En Supabase, creá un proyecto y abrí **SQL Editor → New query**. Pegá todo [001_intercompany.sql](db/001_intercompany.sql) y ejecutalo con **Run**. Se crean `intercompany_operations` e `intercompany_used_challenges`.
2. En el encabezado del proyecto, abrí **Connect → Transaction pooler**. Copiá la URI de Postgres del puerto `6543` y reemplazá el marcador de contraseña por la contraseña de la base. Ese es `DATABASE_URL`. Usá el usuario `postgres.<project-ref>` que trae esa URI y mantené la conexión con TLS. [Conexión a Postgres en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)

### 4. Configurá y probá Next.js en tu máquina

Desde `web`, creá `.env.local` a partir de [la plantilla](.env.example). Generá el secreto de sesión en tu terminal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Completá los marcadores con los valores de los pasos anteriores:

```dotenv
NEXT_PUBLIC_MODE=chain
NEXT_PUBLIC_VAULT_ADDRESS=<direccion-del-vault-en-fuji>
NEXT_PUBLIC_TOKEN_ADDRESS=<direccion-que-devuelve-token>
NEXT_PUBLIC_VAULT_DEPLOY_BLOCK=<bloque-decimal-de-creacion>
DATABASE_URL=<uri-de-supabase-transaction-pooler>
INTERCOMPANY_SESSION_SECRET=<secreto-generado>
APP_ORIGIN=http://localhost:3000
```

El RPC público de Fuji viene configurado. Si el equipo tiene otro RPC de Fuji, podés ponerlo en `AVALANCHE_RPC_URL` del servidor. Guardá `.env.local` solo en tu máquina. Si usás otro puerto u host, poné exactamente ese origen en `APP_ORIGIN`.

```powershell
npm install
npm run dev
```

Abrí `http://localhost:3000/mover` en un navegador con la wallet. Conectá el tesorero, firmá el mensaje de acceso y elegí **Caja central → Local Palermo**. Registrá un préstamo de **1 token** al **12,5% TNA** y firmá la transacción. Abrí `/dashboard` y comprobá que el registro diga **Confirmada**, muestre el capital y la tasa y tenga un enlace al hash. Con el ejemplo de arriba, los saldos pasan de **10 / 0** a **9 / 1**. Si la transacción salió pero no se concilió, copiá el hash de la wallet y usá **Conciliar transacción**.

### 5. Subí la misma configuración a Vercel

Subí a GitHub la rama que contiene el backend, incluida la carpeta `web/src/app/api/intercompany`. En Vercel, importá el repo con preset **Next.js** y **Root Directory `web`**. En **Settings → Environment Variables → Production**, cargá las mismas claves, con `APP_ORIGIN` igual al dominio HTTPS que vas a usar para la demo, sin una ruta al final. Guardá ahí la URI de Postgres y el secreto. Si todavía no tenés el dominio, creá el proyecto, copiá su dominio estable y cargá la configuración antes del redeploy. Después de guardar las variables, hacé **Redeploy** y repetí la prueba desde el dominio configurado. [Vercel para monorepos](https://vercel.com/docs/monorepos) · [Variables de entorno](https://vercel.com/docs/environment-variables/managing-environment-variables)

| Si ves esto | Revisá esto |
| --- | --- |
| Aparece el dashboard de demo | `NEXT_PUBLIC_MODE=chain` en el entorno correcto y nuevo build después del cambio. |
| «Origen de la solicitud inválido» | La URL abierta debe coincidir con `APP_ORIGIN`, incluido HTTPS y el dominio exacto. |
| «Esta wallet no tiene el rol TESORERO» | Cuenta activa y rol en el vault configurado. |
| «Faltan la dirección del vault, del token o el bloque» | Las tres variables públicas deben estar completas. El bloque se carga como número decimal. |
| «No se pudo consultar Fuji o Postgres» | Logs de Vercel, cadena del RPC, URI del pooler con la contraseña correcta y migración aplicada. |
| Falta saldo para mover | Saldo interno de origen en `verOperativas()` y AVAX de prueba en la wallet para pagar gas. |

Para la entrega guardá el enlace al **vault verificado**, el **hash de un movimiento iniciado desde la web** y la **URL de Vercel**.

## Demo del préstamo autónomo en Fuji

1. En **Supabase → SQL Editor**, ejecutá [002_treasury_automation.sql](db/002_treasury_automation.sql) después de la primera migración.
2. Creá una cuenta de wallet dedicada a la demo y mandale AVAX de Fuji para gas. En **Remix → Deployed Contracts → TreasuryVault**, conectá la cuenta administradora. Copiá el resultado de `TESORERO()` y ejecutá `grantRole(bytes32 role, address account)` con ese rol y la dirección pública de la cuenta automática. Verificá que `hasRole` devuelva `true`. Ese rol también habilita pagos y retiros, por lo que la cuenta se usa solo con el vault de prueba y mARGt.
3. En **Vercel → Settings → Environment Variables → Production**, agregá `TREASURY_AUTOMATION_VAULT` con la misma dirección de Fuji que `NEXT_PUBLIC_VAULT_ADDRESS`. Agregá `TREASURY_AUTOMATION_PRIVATE_KEY` como secreto de servidor con la clave de la cuenta automática en formato `0x…`. En MetaMask la encontrás en **Fluuix Bot → ⋮ → Account details → Private key**. Hacé redeploy. Para probar en local, configurá esas dos variables en `.env.local`. `OPENAI_API_KEY` es opcional para el modo normal. El modo pitch usa un umbral simulado de 0,75 mARGt ante el pico de actividad.
4. Verificá en `/dashboard` que Caja central tenga **9,5 mARGt** y Palermo, ID `1`, tenga **0,5 mARGt**. Abrí sesión con tu wallet de tesorero antes de presentar. Elegí **Escenario de pitch · 5 segundos** y **Pico de tráfico y ventas**. Tocá **Evaluar tesorería** y dejá la pestaña abierta. Mostrá el préstamo al **5% TNA**, los saldos **8 / 2 mARGt** y el enlace a Snowtrace. Grabá esa ejecución como respaldo.
5. Para repetir, devolvé **1,5 mARGt** desde Palermo a Caja central con `/mover`. Para ensayar el veto con los mismos saldos y el umbral simulado, repetí en **Escenario de pitch** y tocá **Vetar** dentro de los cinco segundos. Verificá que los saldos sigan iguales.

**Guion de demo.** Palermo muestra señales de mayor actividad → el escenario muestra un umbral preventivo y lo explica → Fluuix ejecuta y registra el préstamo en Avalanche Fuji. Tráfico, ventas y umbral preventivo son simulados. La pantalla `/agente` muestra la simulación de colocación del excedente y de Belo. Crédito con colateral, comercio exterior y firma automática de contratos quedan en el roadmap.

El backend revalida los saldos de Fuji antes de firmar. El contrato actual verifica saldo suficiente al ejecutar y los umbrales de reserva son una política de la app. El registro conciliado guarda el capital, la tasa y el comprobante. La tasa es un dato contable de la demo.

La API firma el desafío de sesión con un nonce de un solo uso. La wallet firma el mensaje de acceso y luego la transacción. Postgres guarda la tasa y la nota, y la transacción publica la referencia `FLX:<uuid>`. La API verifica la red, el emisor, el vault, los argumentos y el evento antes de confirmar. Si la conciliación se interrumpe, pegá el hash de la wallet en **Conciliar transacción**.

Las rutas disponibles son `POST /api/intercompany/session`, `GET /api/intercompany`, `POST /api/intercompany` y `POST /api/intercompany/:id/confirmacion`. La preparación reutiliza un UUID de operación para reintentos con los mismos datos. El contrato actual permite que una wallet firme dos transacciones distintas con la misma referencia. Para automatizar la firma desde un ERP hace falta bloquear referencias duplicadas en el vault. Depósitos, pagos, rebalanceo y el agente se prueban en modo demo.


## Actualización de seguridad audit-fix v2

Para esta versión aplicar **003_revoked_sessions.sql** antes de desplegar el backend,
además de 001 y, si corresponde, 002. La migración 002 sigue siendo la automatización.
Configurar `APP_ORIGIN` HTTPS exacto en producción. El plazo de pitch de cinco segundos
requiere `TREASURY_AUTOMATION_ALLOW_DEMO=true` explícito en el servidor y un vault exclusivo
de prueba; el panel comienza en modo normal. El modo normal también usa señales de demo.

El circuito manual pide la firma de la wallet del tesorero. El circuito automático nuevo
firma con la wallet del servidor: no afirmar que cada operación automática tiene firma
humana. Cerrar sesión revoca la cookie, pero no cancela propuestas existentes ni retiros
ya emitidos. La comparación del hash protege contra discrepancias, no contra control total
malicioso de la base o de la clave.

Ver [informe](../docs/auditoria-v2/INFORME.md) y
[aplicación y validación](../docs/auditoria-v2/APLICACION-Y-VALIDACION.md).
Ejecutar `npm ci --ignore-scripts`, `npm run check` y las pruebas de integración antes del merge.
Esta entrega no acredita producción bancaria ni seguridad del contrato no incluido.
