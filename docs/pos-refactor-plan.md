# Plan de refactorización del POS

- **Ruta:** `/workstation/user/pos`
- **Componente coordinador:** `app/workstation/user/pos/page.tsx`
- **Estado:** Fases 1–3 completadas; Fase 4 en curso; Fase 5 pendiente.
- **Objetivo:** continuar la refactorización en sesiones posteriores manteniendo el comportamiento de venta.

## Estado actual

`page.tsx` pasó de unas 2.450 líneas a aproximadamente 1.300. Mantiene el estado, handlers y coordinación de las operaciones de negocio. Componentes presentacionales y cálculos están organizados en `_components/` y `lib/workstation/pos-ticket.ts`.

- Catálogo: `CustomerPetBar`, `CatalogItemCard` y `CatalogPanel`; filtros, paginación y mutaciones siguen coordinados desde `PosPage`.
- Ticket: `SaleTicket`, `CartLineList`, `TicketSummary`, `PaymentPanel` y `TicketActions`.
- Diálogos: cliente, cuotas, precio variable, información de catálogo, limpiar ticket y ventas en espera.
- Cálculos: `calculatePosTicketTotals` en `lib/workstation/pos-ticket.ts`.
- Borrador: `usePosDraftAutosave` encapsula el timer, guardado serializado y referencias de sincronización.
- Checkout, pausa y reanudación siguen en `PosPage` para preservar el control del flujo.

## Trabajo pendiente

1. Completar revisión de limpieza: imports/tipos sin uso, duplicaciones y legibilidad de handlers.
2. Ejecutar `npm run lint` y `npm run build`.
3. Probar manualmente venta directa, borrador (guardar/retomar/descartar), cuenta en espera (retomar, juntar y reemplazar carrito), pagos mixtos/cuotas, descuento, errores de checkout e impresión.
4. Revisar teclado, foco/accesibilidad de diálogos y distribución en pantalla normal y ancha.
5. Corregir hallazgos, actualizar este documento y cerrar Fase 5.

## Límites

No cambiar contratos API, reglas de precio/pago/caja ni rediseñar checkout. Mantener la vista de POS a ancho completo condicionada a esta ruta. Extraer más lógica solo cuando sus dependencias y secuencia de efectos estén claras.

## Nota de revisión

Al juntar el carrito actual con una cuenta en espera, se pausa el autoguardado y se cancela su timer antes de esperar escrituras en curso. El carrito actual se conserva en una copia para combinarlo con la venta reanudada.

## Para retomar

Revisar el diff del commit de checkpoint, ejecutar lint/build y hacer la prueba manual de los flujos enumerados. Empezar por borradores y cuentas en espera, que coordinan escrituras, borrado del borrador y recuperación de ventas.