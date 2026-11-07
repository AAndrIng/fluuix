# Lista para calificar la entrega

Cada fila se califica por **evidencia**: comprobado localmente, pendiente de integración, no demostrado o fuera de alcance. No sumar esos estados como porcentaje de “seguridad”.

| Control | Evidencia entregada | Estado |
|---|---|---|
| El archivo de entrada está identificado | SHA-256 e inventario de 70 archivos | Comprobado localmente |
| Se conservó el código de los compañeros | Snapshot de base y diff revisable; sin cambio del lock | Comprobado localmente |
| Sesión cerrada no se reutiliza | Suite de 35 pruebas; SQL aditivo | Comprobado con DB simulada; integración pendiente |
| Límite de bytes y tiempo de lectura | Streams reales en pruebas | Comprobado localmente; proxy pendiente |
| Pitch requiere permiso de servidor | Suite de automatización | Comprobado con servicios simulados |
| Política revalida monto, tasa, destino y reservas | Casos positivos/negativos | Comprobado localmente; contrato pendiente |
| Hash coincide antes de broadcast | Doble determinístico | Lógica comprobada; hash/viem real pendiente |
| Código compila en Next.js | No hubo dependencias completas | Pendiente |
| Migración y RLS efectivos | SQL entregado, no ejecutado | Pendiente |
| Fondos y contratos de prueba | Sin fuentes Solidity ni despliegue validado | No demostrado |
| El modelo usa datos reales del negocio | Escenarios sintéticos en código | No implementado en el snapshot |
| Cumplimiento bancario institucional | Matriz de brechas, no auditoría organizacional | No demostrado |
| PR o despliegue publicados | Sin escritura remota en esta entrega | No realizado |

Responsable revisor: ____________________  Fecha: ____________________

Versión y entorno evaluados: _________________________________________

Decisión (aceptar en staging / devolver con observaciones / no aprobar): ____________________

Observaciones y pruebas externas adjuntas: ____________________________
