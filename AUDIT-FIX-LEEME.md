# Fluuix audit-fix v2 — empezar acá

Este ZIP contiene el código completo del snapshot recibido más las correcciones de la
segunda revisión. No es un despliegue ni una aprobación bancaria. No contiene `.git`,
`node_modules`, claves ni configuración privada.

**Antes de ejecutar:** leer `docs/auditoria-v2/APLICACION-Y-VALIDACION.md`.
Aplicar la migración **003** en staging antes del backend. La **002** sigue perteneciendo
a la automatización. El pitch de cinco segundos requiere autorización explícita mediante
`TREASURY_AUTOMATION_ALLOW_DEMO=true`; mantener `false` fuera de la prueba dedicada.

El laboratorio pasó **81 pruebas aisladas**, no el build integral. No hubo acceso al
registro npm ni pruebas reales de Postgres, wallet o blockchain. Las evidencias y sus
límites figuran en `docs/auditoria-v2/INFORME.md` y en la carpeta `evidencias`.

Para conservar historial y colaborar, usar el archivo `.patch` en una rama de un clon
limpio. No reemplazar ciegamente el directorio de trabajo del equipo. No publicar en main
ni introducir liquidez real antes de validación y revisión independiente.
