# dialog

2026-08-24 · transformation engine (composición de Radix hecha a mano, no wrapper de shadcn — no existe golden pair que replicar) · migrado y verificado con `tsc` + `eslint` en verde.

## Changed

`src/features/giveaway-platform/components/PartnerConsentModal.tsx` — único consumidor de `@radix-ui/react-dialog` del proyecto.

- **Import** (`:5`): `import * as Dialog from '@radix-ui/react-dialog'` → `import { Dialog } from '@base-ui/react/dialog'`. El namespace import pasa a named import; un solo subpath.
- **`Dialog.Trigger`** (`:31`): `asChild` → `render={<button … />}`, con el texto del botón como children del Trigger.
- **`Dialog.Overlay` → `Dialog.Backdrop`** (`:90`): renombre de parte. Estilos inline intactos.
- **`Dialog.Content` → `Dialog.Popup`** (`:99`): renombre de parte. **Sin `Positioner`**: es un modal centrado y ya se posiciona con `position: fixed` + `translate(-50%, -50%)` propios, que es justo el caso que la referencia marca como "centered modals: no Positioner".
- **`Dialog.Title`** (`:132`) y **`Dialog.Description`** (`:142`): `asChild` → `render`, children subidos al primitivo. Se conservan los `id` explícitos y los `aria-labelledby`/`aria-describedby` del Popup aunque Base UI ya los cablea solo — quitarlos habría sido un cambio de comportamiento no pedido.
- **`Dialog.Close`** (`:219`): `asChild` → `render`. `disabled={pending}` se mueve del `<button>` interno al primitivo para que Base UI conozca el estado y emita `data-disabled`; sigue llegando al botón nativo.

Estructura final: `Root > Trigger` + `Portal > Backdrop, Popup > Title, Description, Close`.

Barrido de restos: `grep -n "radix-ui\|@radix-ui"` sobre el fichero → **limpio**.

## Left alone

- El `<input type="checkbox">` nativo de `ConsentCheckbox` y su `<label>`: nunca fueron Radix. Base UI tiene un `Checkbox`, pero cambiarlo excede la migración pedida.
- `next/link` dentro de `Dialog.Description`: ajeno a Radix.
- Todos los estilos inline: se conservan carácter por carácter. La migración no toca el aspecto.

## Behavior changes

- **`onOpenChange` cambia de firma**: Base UI llama `(open, eventDetails)` en vez de `(open)`. `setOpen` sigue siendo válido —el segundo argumento lo ignora el setter de `useState`— pero si algún día hace falta vetar un cierre concreto, ya no se hace con `event.preventDefault()` sino con `eventDetails.cancel()` filtrando por `eventDetails.reason` (`'escape-key'`, `'outside-press'`, …).
- **`Dialog.Portal` de Base UI renderiza un `<div>` contenedor**; el de Radix no añadía nada. Si algún selector CSS o test depende de la estructura del portal, cambia.
- **Animaciones de entrada/salida**: Base UI expone `data-starting-style` / `data-ending-style` en vez de `data-[state=open|closed]`. Aquí no había animaciones declaradas, así que no hay nada que reescribir — pero es la vía si se añaden.

## Verify by hand

1. Abrir el modal desde el botón "Confirmar y ver ofertas": debe centrarse y el fondo oscurecerse con blur.
2. Pulsar `Escape` → cierra. Clic fuera del panel → cierra.
3. Con el modal abierto, `Tab` repetido: el foco no debe salir del modal (focus trap).
4. Al cerrar, el foco debe volver al botón que lo abrió.
5. Marcar los 3 checkboxes y aceptar: el botón pasa a "Guardando…" y "Cancelar" queda deshabilitado durante el `pending`.
6. Lector de pantalla: el modal debe anunciar el título "Confirma que has leído y aceptas" y la descripción.
