# popover

2026-08-24 · transformation engine (composición de Radix hecha a mano, no wrapper de shadcn) · 3 instancias migradas y verificadas con `tsc` + `eslint` en verde.

## Changed

`src/features/admin/tasks/components/TaskList.parts.tsx` — único consumidor de `@radix-ui/react-popover` del proyecto. Tres popovers idénticos en estructura: Prioridad, Estado y Asignado, todos en la fila de tarea.

- **Import** (`:4`): `import * as Popover from '@radix-ui/react-popover'` → `import { Popover } from '@base-ui/react/popover'`.
- **Constante nueva `POPOVER_POSITIONER_CLS`** (`:93`): `'isolate z-50'`. Base UI parte el `Content` de Radix en `Positioner` (colocación y apilado) + `Popup` (la caja estilada), así que **`z-50` sale de `POPOVER_PANEL_CLS` y pasa al Positioner**. El resto de clases del panel se queda intacto en el Popup.
- **`Popover.Trigger` ×3**: `asChild` → `render={<button … />}`, children subidos al primitivo. `disabled={isPending}` se mueve al primitivo para que Base UI emita `data-disabled`; sigue llegando al botón nativo. `aria-label` y `aria-busy` se quedan en el elemento renderizado.
- **`Popover.Content` → `Popover.Positioner > Popover.Popup` ×3**: es el cambio estructural de fondo. `sideOffset={6}` y `align="start"` son props de posicionamiento y **migran al Positioner**; `className` del panel se queda en el Popup. El tercer popover conserva sus extras `max-h-64 overflow-auto` en el Popup.
- **`Popover.Close` ×3**: `asChild` → `render={<button … />}` con `onClick`, `data-selected` y `OPTION_CLS` en el elemento renderizado.

Estructura final por popover: `Root > Trigger` + `Portal > Positioner > Popup > ul > li > Close`.

Barrido de restos: `grep -n "radix-ui\|@radix-ui\|asChild\|Popover.Content"` sobre el fichero → **limpio**. 6 etiquetas `Popover.Positioner` (3 de apertura + 3 de cierre), como corresponde.

## Left alone

- `PriorityBadge`, `TaskStatusBadge`, `RecurrenceBadge`, `Avatar`: componentes propios, nunca fueron Radix.
- Los `<select>` nativos de la barra de filtros (`SEL_CLS`): son HTML nativo, no primitivos. Base UI tiene `Select`, pero cambiarlos no es parte de esta migración.
- El `role="listbox"` / `role="option"` manual sobre `<ul>`/`<li>`: se conserva tal cual. Base UI tiene `Menu` con semántica propia, pero migrar a `Menu` cambiaría el rol ARIA y el comportamiento de teclado — sería un rediseño, no una migración.

## Behavior changes

- **Los defaults de colisión cambian**. Radix: `collisionPadding = 0`, `arrowPadding = 0`. Base UI: **`5` en ambos**. El código nunca los declaró explícitamente, así que hereda el nuevo default: los paneles ahora guardan 5px con el borde del contenedor de colisión en vez de pegarse. Es el delta visible más probable, y afecta sobre todo a las tareas de las últimas filas de la tabla.
- **`Popover.Portal` de Base UI renderiza un `<div>` contenedor**; el de Radix no añadía nada. Relevante si un selector CSS o un test E2E depende de la estructura del portal.
- **`onOpenChange` cambia de firma** a `(open, eventDetails)` con razones que ahora incluyen `'trigger-hover'` y `'trigger-focus'`. Aquí los tres popovers son no controlados, así que no afecta hoy.
- **`avoidCollisions` ya no es booleano**: si algún día hace falta desactivarlo, es `collisionAvoidance={{ side: 'none', align: 'none', fallbackAxisSide: 'none' }}`.
- **`z-50` cambia de elemento** (del panel al positioner). El apilado efectivo es el mismo, pero si alguna regla CSS externa apuntaba al panel por su z-index, ya no lo encuentra ahí.

## Verify by hand

1. En `/admin/tareas`, clic en la píldora de **Prioridad** de una tarea: el panel abre debajo, alineado a la izquierda, con 6px de separación.
2. Elegir una prioridad distinta: el panel cierra y la píldora refleja el cambio.
3. Repetir con **Estado** y con **Asignado**. El de Asignado debe hacer scroll interno si hay muchos usuarios (`max-h-64`).
4. Teclado: `Enter`/`Espacio` abre, `Escape` cierra, `Tab` recorre las opciones y el foco vuelve al disparador al cerrar.
5. **Filas del final de la tabla**: comprobar que el panel no queda cortado ni tapado por elementos posteriores — es donde se notaría el cambio de `collisionPadding` y el traslado de `z-50`.
6. Mientras una tarea está guardando (`isPending`), su disparador debe estar deshabilitado y no abrir el panel.
