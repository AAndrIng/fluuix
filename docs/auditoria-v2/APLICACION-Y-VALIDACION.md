# Aplicación y validación — audit-fix v2

## Advertencias de integración

Trabajar en una rama y un entorno de **staging**, con una wallet exclusiva de Fuji y tokens de prueba. No usar claves de clientes ni mover liquidez real. No copiar el ZIP encima de una carpeta con cambios locales sin revisar las diferencias.

El ZIP no incluye `.git`. Para conservar el historial, preferir el parche en un clon del repositorio. La referencia base declarada es `6db42cb9cca3923d98d11e4f99eada280b06a30f`; si la rama del equipo cambió, revisar el diff y resolver la integración, no forzarla.

## 1. Incorporar el parche en una rama

Desde un clon limpio y con el parche descargado fuera del repositorio:

```bash
git status --short
git fetch origin
git switch -c audit-fix/2026-11-07-v2 6db42cb9cca3923d98d11e4f99eada280b06a30f
git apply --check /ruta/al/Fluuix-audit-fix-v2.patch
git apply --index /ruta/al/Fluuix-audit-fix-v2.patch
git diff --cached --stat
```

Detenerse ante errores. No usar `--force`, no descartar cambios de compañeros y no hacer push a `main`. `git apply --check` comprueba contexto; no sustituye revisión ni pruebas.

## 2. Dependencias y pruebas

Usar Node.js 22, versión 22.16 o posterior en esa rama. Con acceso al registro npm:

```bash
cd web
npm ci --ignore-scripts
npm test
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=high
```

No cambiar versiones para ocultar errores. El lock original sigue intacto. Las dependencias tienen que provenir del registro configurado y verificarse mediante su integridad de lock. Esta entrega no prueba que no existan vulnerabilidades de dependencias.

`npm run check` encadena pruebas, lint, tipos y build. No ejecuta migraciones ni transacciones. El workflow de GitHub contiene los mismos controles esenciales y no recibe secretos de despliegue.

La evidencia local se produjo con TypeScript 5.8.3 para los arneses; la repetición con 5.9.3 del lock es obligatoria antes de aceptar la rama. No distribuir el enlace temporal al compilador del laboratorio.

## 3. Base de datos: orden y precauciones

Solicitar copia de respaldo y responsable del cambio. Ejecutar SQL con una conexión administrativa de staging y `ON_ERROR_STOP`, o desde el SQL Editor de staging. No pegar la URI o contraseña de producción en un ticket, PR o chat.

| Situación | Qué aplicar |
|---|---|
| Base nueva, sin automatización | `001_intercompany.sql`, luego `003_revoked_sessions.sql`. |
| Base nueva, con automatización | `001_intercompany.sql`, `002_treasury_automation.sql`, `003_revoked_sessions.sql`. |
| Base con 001 y 002 ya aplicadas | Solo `003_revoked_sessions.sql`. |

**No usar `002_revoked_sessions.sql` del paquete anterior:** aquí 002 corresponde a la automatización del equipo. La numeración se resolvió sin sobrescribirla.

La migración 003 añade `intercompany_revoked_sessions`, índice, RLS y revocación de privilegios públicos. No modifica saldos ni operaciones. Contempla que los roles `anon` y `authenticated` pueden no existir fuera de Supabase. La migración 002 original conserva sus supuestos de roles y debe revisarse al usar Postgres genérico.

El usuario de aplicación necesita acceso al mecanismo de revocación según el modelo de RLS y permisos aprobado por el DBA. No conceder permisos amplios a usuarios de navegador para solucionar errores. Probar de manera efectiva qué operaciones pueden realizar `anon`, `authenticated` y el rol de aplicación.

El backend nuevo falla cerrado cuando no puede comprobar revocaciones. Desplegarlo sin la migración o sin permisos adecuados puede bloquear sesiones; el orden es **migración, prueba de permisos, backend**.

Verificar tiempo coherente entre aplicación y base: la expiración de credenciales y la limpieza de revocaciones dependen de relojes. La limpieza automática no es una política de retención de registros de auditoría institucional.

## 4. Variables y cambios de comportamiento

Copiar `.env.example` a un archivo local ignorado por Git; completar por un canal de secretos aprobado. Las claves de servidor no deben llevar prefijo `NEXT_PUBLIC_`.

- `APP_ORIGIN`: origen HTTPS exacto en producción, sin ruta, query, fragmento o credenciales. En desarrollo se permite HTTP en `localhost`, `127.0.0.1` o `[::1]`.
- `INTERCOMPANY_SESSION_SECRET`: secreto aleatorio robusto en el gestor de secretos. Un cierre de sesión revoca un nonce; una rotación del secreto afecta todas las cookies existentes y exige un procedimiento coordinado.
- `TREASURY_AUTOMATION_ALLOW_DEMO=false`: valor seguro inicial. Solo usar `true` para ensayar el pitch en un vault exclusivo de Fuji. El modo normal sigue utilizando datos de actividad simulados; no se convierte en producción por su nombre.
- `TREASURY_AUTOMATION_PRIVATE_KEY`: clave de una wallet de prueba de Fuji; no debe copiarse al repositorio ni al navegador. El parche no sustituye este esquema por HSM/MPC ni acredita custodia bancaria.

Los POST con cookies deben incluir `Origin` coincidente. Para pruebas con curl o clientes propios, agregar ese encabezado sin tratarlo como credencial. Nunca deshabilitar el control para “hacer funcionar” un cliente.

## 5. Pruebas de aceptación en staging

Registrar versión desplegada, fecha, responsable y evidencia. Usar exclusivamente tokens de prueba.

| ID | Prueba | Resultado exigido |
|---|---|---|
| E2E-01 | Iniciar sesión con tesorero y con wallet sin rol. | Acceso solo con rol; desafío usado no reutilizable. |
| E2E-02 | Copiar una cookie sintética de staging, cerrar sesión y probar la copia. | Rechazo de la copia, incluso en otra instancia. No adjuntar cookies reales a la evidencia. |
| E2E-03 | Interrumpir acceso a la tabla de revocación en un entorno aislado. | No aceptar sesiones ni anunciar un cierre exitoso sin persistencia. Restaurar permisos controladamente. |
| E2E-04 | POST sin Origin, desde otro origen y cuerpo superior a 8192 bytes. | 403 / 413 sin procesamiento del movimiento. |
| E2E-05 | Transferencia manual en Fuji desde la UI. | Transacción firmada por la wallet; hash, recibo, evento y saldos concordantes. |
| E2E-06 | Solicitar pitch con flag false, incluso mediante POST manual. | 403 y ninguna firma/operación nueva. |
| E2E-07 | Habilitar pitch en vault de prueba y vetar antes del plazo. | Estado vetado, sin cambio de saldo ni firma posterior. |
| E2E-08 | Automatización de prueba permitida. | Una intención y una transacción conciliada; firma del bot identificado; comprobar fuente y destino. |
| E2E-09 | Modificar saldo entre evaluación y avance. | Descartar propuesta que viole reserva/objetivo. Probar además concurrencia real: una prueba secuencial no garantiza reservas onchain. |
| E2E-10 | Dos pestañas avanzan la misma propuesta. | Ninguna firma distinta emitida para duplicar la intención. Verificar atomicidad en Postgres y hashes, no solo la UI. |
| E2E-11 | Cerrar y reabrir la pestaña, reintentar por fallo RPC o transacción reemplazada. | Estado recuperable y conciliación coherente; documentar los escenarios todavía no soportados. |
| E2E-12 | Inspeccionar headers, SSR, hidratación y conexión de wallet. | Sin regresión funcional; protección contra embedding activa. La CSP parcial no acredita protección completa XSS. |

No ejecutar estas pruebas sobre el servicio de terceros ni provocar carga contra un RPC público. Las simulaciones de fallos deben hacerse con dobles locales o infraestructura de staging controlada.

## 6. Rollback y operaciones pendientes

El esquema nuevo es aditivo. No borrar la tabla de revocaciones como primera medida: las cookies copiadas podrían recuperar acceso con el código anterior. Frente a una falla, detener nuevas automatizaciones, limitar el acceso, conservar evidencia y revisar si hubo transacciones firmadas o emitidas.

Retirar una habilitación no borra transacciones de la red. Rotar la clave de sesión en todas las instancias, invalidar sesiones y revisar las propuestas pendientes puede ser necesario; esa operación debe coordinarla el responsable de despliegue. No modificar manualmente estados, nonce de wallet, hashes o saldos para destrabar un movimiento sin conciliación.

## 7. Abrir el PR de borrador

Solo después de revisar pruebas y diff, y desde la rama audit-fix:

```bash
# Desde la raíz del repositorio
git commit -m "audit-fix: revocación, límites HTTP y controles de automatización"
git push -u origin audit-fix/2026-11-07-v2
gh pr create --draft --base main --head audit-fix/2026-11-07-v2 \
  --title "audit-fix: revocación, límites HTTP y controles de automatización" \
  --body-file docs/auditoria-v2/PR-audit-fix.md
```

Estos comandos no fueron ejecutados contra GitHub en esta entrega. Requieren permisos efectivos del colaborador y su autenticación local; el problema previo de la integración no se corrige entregando un ZIP. No compartir un token en el chat.
