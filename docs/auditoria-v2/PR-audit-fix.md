# audit-fix: revocación, límites HTTP y controles de automatización

## Resumen

Integra correcciones sobre el snapshot entregado como ZIP, con referencia declarada `6db42cb9cca3923d98d11e4f99eada280b06a30f`. Conserva dependencias y lock; no modifica contratos ni despliega.

## Cambios

- Revocación de sesión en servidor; lectura HTTP incremental y acotada; origen HTTPS explícito en producción y cabeceras preventivas.
- Migración **003_revoked_sessions.sql**, sin colisionar con **002_treasury_automation.sql**.
- Pitch de cinco segundos con habilitación explícita del servidor, también comprobada sobre propuestas persistidas. Conciliación permitida de operaciones ya confirmadas.
- Validación adicional de préstamos persistidos y coincidencia de hash antes de emitir bytes firmados.
- Pruebas, comandos de verificación, workflow sin secretos y documentación legible en castellano.

## Evidencia ejecutada

**81/81 pruebas locales aprobadas**: 17 existentes, 35 de HTTP/sesiones y 29 de automatización. Transpilación aislada de 37 archivos y typecheck de cuatro módulos puros.

Los arneses simulan NextResponse, Postgres, RPC, wallet y hash Ethereum en las pruebas del servicio. HMAC y límites de streams son reales. No hubo transacciones o llamadas al modelo real. Se usó TypeScript 5.8.3 local para transpilar; repetir en CI con 5.9.3 del lock.

## No validado todavía

- Instalación completa, lint integral, tipos integrales, build y auditoría de dependencias: el laboratorio no tuvo acceso al registro npm.
- Migración y permisos de Postgres, concurrencia, navegador/wallet, RPC y contrato desplegado.
- Custodia de producción, límites onchain, gobierno institucional y cumplimiento regulatorio.

## Cambios operativos

Aplicar 003 y verificar permisos antes del backend. Configurar `APP_ORIGIN` HTTPS en producción. El modo pitch queda desactivado salvo `TREASURY_AUTOMATION_ALLOW_DEMO=true` en un vault de prueba. Los clientes POST deben aportar Origin exacto.

## Antes de merge

- [ ] Revisión de código por otra persona.
- [ ] CI con dependencias del lock y sin excepciones ocultas.
- [ ] Migración y permisos validados en staging.
- [ ] Cookie revocada rechazada entre instancias.
- [ ] Transferencia manual y automatización/veto comprobados en Fuji.
- [ ] Contratos y bytecode incorporados a un alcance de auditoría separado.

Propuesto como **Draft PR**. No declara certificación bancaria, aprobación de producción ni seguridad integral del producto.
