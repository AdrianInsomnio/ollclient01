# Plan de refactorización del POS

**Ruta:** `/workstation/user/pos`  
**Componente actual:** `app/workstation/user/pos/page.tsx`  
**Estado:** planificación; pendiente de iniciar  
**Propósito:** poder retomar el trabajo en una sesión posterior sin cambiar el comportamiento de venta.

## Contexto actual

La página concentra en un solo archivo de aproximadamente 2.450 líneas el catálogo, selección de tutor y mascota, ticket, cobro, descuentos, cuotas, borradores, ventas en espera, impresión y varios diálogos. También mantiene estado de red, sincronización del borrador y reglas de checkout. La mezcla de presentación y lógica hace costoso localizar el origen de cambios visuales y aumenta el riesgo al tocar la venta.

La página vive dentro de `app/workstation/user/layout.tsx`, que comparte el contenedor de ancho máximo con las otras rutas de usuario. Se está ajustando ese contenedor de forma condicional para que POS use el ancho horizontal disponible. Mantener ese comportamiento durante la refactorización.

## Objetivos

- Separar responsabilidades en componentes pequeños sin modificar el flujo ni las reglas comerciales.
- Mantener accesibles búsqueda, catálogo, ticket y cobro en los tamaños de pantalla soportados.
- Conservar borrador automático, recuperación de ventas en espera, cuotas, impresión, descuentos y accesos por teclado.
- Mantener datos y operaciones conectados a las funciones API actuales.
- Facilitar cambios visuales futuros con componentes presentacionales reutilizables.

## Límites de alcance

- No cambiar contratos de API, esquema de datos, reglas de precios, pagos ni políticas de caja.
- No rediseñar checkout ni eliminar campos o acciones.
- No mover ni modificar páginas ajenas a POS, salvo el ajuste de layout ya condicionado a esta ruta.
- No realizar una reescritura integral en un solo paso.

## Diseño objetivo

Mantener `page.tsx` como coordinador de la página y extraer módulos locales bajo `app/workstation/user/pos/_components/` y lógica bajo `app/workstation/user/pos/_hooks/` cuando exista una responsabilidad clara.

### Componentes de interfaz

1. **PosWorkspace**: distribución general, catálogo y columna del ticket.
2. **CustomerPetBar**: tutor, mascota y acceso a cuotas.
3. **CatalogPanel**: búsqueda, pestañas, categorías, resultados y paginación.
4. **CatalogItemCard**: presentación de producto/servicio, stock, precio y acciones.
5. **SaleTicket**: líneas del carrito, cantidades, importes, descuento, total y acciones de guardar/cobrar.
6. **PaymentDialog**, **DiscountDialog**, **ClientPickerDialog**, **InstallmentPickerDialog** y diálogos de borrador/venta en espera, extraídos gradualmente sin cambiar sus props funcionales.

### Lógica y estado

- Agrupar la lógica de catálogo (filtros, categorías y paginación) en un hook o módulo puro.
- Agrupar las acciones del ticket (agregar, editar cantidad, quitar, calcular subtotal/descuento/total) manteniendo una única fuente de verdad para `cart`.
- Aislar el ciclo de borrador automático y su sincronización en un hook después de mapear todos sus refs, timers, eventos y condiciones de carrera.
- Mantener checkout, reanudación de venta e impresión en funciones separadas y explícitas; extraerlas solo cuando sus dependencias sean claras.
- Evitar introducir un estado global nuevo sin una necesidad demostrada.

## Secuencia propuesta

### Fase 0 — Preparación y mapa de comportamiento

- Revisar el estado actual de `page.tsx`, sus imports, listeners de teclado/eventos y funciones API.
- Identificar qué secciones tienen estado local, qué cálculos son derivados y qué acciones tienen efectos externos.
- Anotar los flujos de uso que deben mantenerse: venta directa, tutor/mascota, cuotas, borrador, venta en espera, descuento, pago mixto, impresión y error de checkout.
- Confirmar el ajuste de ancho de POS condicionado por ruta en `layout.tsx`.

**Salida:** mapa breve de dependencias y lista de responsabilidades con límites de props/estado.

### Fase 1 — Extracciones presentacionales de bajo riesgo

- Extraer `CustomerPetBar`, `CatalogItemCard` y elementos estáticos del catálogo.
- Mantener la consulta, filtros y handlers en `PosPage`.
- Pasar props explícitas; no duplicar cálculos ni estado.

**Criterio de cierre:** misma información, acciones, accesibilidad y distribución visual; `page.tsx` reduce JSX sin mover reglas de negocio.

### Fase 2 — Catálogo

- Extraer `CatalogPanel` con búsqueda, tipo, categoría, resultados, estados vacío/carga y paginación.
- Mantener filtros y selección de página sincronizados con el estado existente.
- Verificar la adaptación a ancho completo y a ventanas estrechas.

**Criterio de cierre:** buscar, filtrar, cambiar página y agregar un artículo funciona igual que antes.

### Fase 3 — Ticket y cálculos

- Extraer `SaleTicket` y los subcomponentes de línea/total.
- Centralizar cálculos derivados en funciones puras o un hook acotado.
- Preservar validaciones, cantidades, precio variable, descuento y estados del ticket.

**Criterio de cierre:** los totales y las acciones coinciden con el comportamiento anterior para tickets vacíos, simples y mixtos.

### Fase 4 — Operaciones y diálogos

- Extraer diálogos por flujo (cliente/mascota, cuotas, descuentos, pagos, borrador y espera).
- Dejar las mutaciones y coordinación de checkout en un hook/controlador solo después de documentar dependencias y errores.
- Revisar persistencia de borradores, recuperación de ventas pausadas, impresión e idempotencia antes de mover cada bloque.

**Criterio de cierre:** no se pierden cambios del borrador ni se duplica una venta al reintentar; todos los flujos conservan sus mensajes y estados.

### Fase 5 — Limpieza y verificación

- Eliminar código duplicado y tipos/imports que ya no se usen.
- Revisar navegación por teclado, etiquetas accesibles, foco de diálogos y comportamiento responsive.
- Hacer revisión manual de los flujos listados en Fase 0 y comparar el POS a ancho normal y ancho completo.
- Ejecutar verificaciones automáticas existentes del proyecto si están disponibles y autorizadas en la sesión de continuación.

**Criterio de cierre:** cada fase puede revisarse de forma independiente, el diff no modifica reglas ajenas a la extracción y no quedan errores conocidos de compilación o interacción.

## Riesgos a vigilar

- **Autoguardado:** refs, temporizadores y orden de guardado pueden perder cambios o disparar escrituras duplicadas si se mueven sin cuidado.
- **Checkout:** hay varios estados de carga/error y referencias al borrador; mantener su secuencia e idempotencia.
- **Cuotas y venta en espera:** dependen de tutor seleccionado y de si el carrito está vacío.
- **Teclado y eventos:** preservar listeners y limpieza al desmontar.
- **Vista ancha:** el ticket es una columna de trabajo intencional; ampliar el contenedor padre no debe hacer que el catálogo o el ticket queden desproporcionados.

## Primer paso al retomar

Leer este documento y revisar el diff vigente de `app/workstation/user/layout.tsx` y `app/workstation/user/pos/page.tsx`. Luego completar la Fase 0 y extraer primero `CustomerPetBar` como cambio pequeño, manteniendo el resto del POS intacto.
