# Fluuix · Treasury Rail

Primera web de producto y demo local inspirada en el TreasuryVault.sol suministrado. Se conserva el proyecto existente en `web/`; no se migró a la carpeta `app/` mencionada por el nuevo documento para no romper el checkout actual. En Vercel, usar `web` como Root Directory.

## Ejecutar

```powershell
npm install
npm run dev
```

Rutas: `/`, `/dashboard`, `/mover`, `/pagos`, `/operativas`, `/depositar`. `/app` conserva el acceso anterior al dashboard; `/comparar` explica que la privacidad pasa al roadmap.

## Guion de demo

1. La caja central comienza con 10.000.000 ARGt simulados; las tres operativas, en cero. Hay otros 10.000.000 disponibles en la wallet de prueba para depositar.
2. Rebalancear todo distribuye 3.000.000 a Palermo, 2.000.000 a Belgrano y 1.000.000 a Distribuidora. Quedan 4.000.000 en la central.
3. Mover 500.000 de Palermo a Distribuidora con concepto Préstamo intercompany.
4. Pagar desde Palermo el lote de tres empleados de 600.000 cada uno. El saldo baja a 700.000, bajo el mínimo de 1.000.000; se reponen 2.300.000 desde la central hasta el objetivo de 3.000.000.
5. Volver al dashboard: caja total 8.200.000, total pagado 1.800.000, volumen interno 8.800.000 y referencia bancaria estimada 105.600 pesos.
6. Revisar el detalle de pagos y exportar movimientos. Se puede importar CSV, crear operativas y editar umbrales.

La persistencia es localStorage y no tiene autenticación: solo es una demo. Reiniciar vuelve al escenario inicial. No se conectan wallets, no hay cifrado, no se firman operaciones ni se generan hashes. La fuente de configuración está en `src/lib/config.ts`; `NEXT_PUBLIC_MODE=chain` muestra explícitamente que falta el adaptador y no convierte la simulación en una operación real.

## Correspondencia con TreasuryVault

Los montos usan BigInt de 18 decimales, serializados como string. `src/lib/treasury-rail.ts` modela depósitos, transferencias internas, pagos/lotes, umbrales y rebalanceo. La reposición ocurre si saldo < mínimo; está limitada por la caja central y sigue el orden de IDs. Un pago requiere fondos suficientes antes de ejecutarse y repone solo después del lote completo. Una transferencia interna no dispara reposición. La caja central no se rebalancea a sí misma.

El simulador exige nombre, wallet válida no nula y monto positivo para cada destinatario; son validaciones de UI adicionales. No reemplaza el contrato ni demuestra su seguridad. El faucet local no modela el cooldown del token real.

## Cálculo comercial

La calculadora usa volumen interno × 1,2% como escenario bruto de referencia bancaria. No determina que una transferencia con stablecoins esté exenta, ni calcula ahorro fiscal neto, comisiones, rampas, exenciones o pagos a cuenta. Fuente: artículo 7 del Decreto 380/2001, biblioteca ARCA. La aplicación enlaza la fuente y describe estos límites.

Privacidad eERC, KYB, inversión vía protocolos y flujo predictivo quedan como roadmap. El contrato suministrado no implementa aprobaciones 2/2, así que fueron retiradas de la demo.

## Verificación

```powershell
node --experimental-strip-types --test scripts/treasury-rail.test.mjs
npx tsc --noEmit
npm run build
```

Para integración real faltan token/vault/bloque de despliegue, ABI verificada del build y un adaptador wagmi/viem con conexión de wallet, control de Fuji, allowance/approve, recibos y lectura de eventos. Los enlaces de Snowtrace deben crearse únicamente con hashes reales confirmados.
