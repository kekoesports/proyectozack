---
read_when: Operating or redeploying quick notes after the confirmed deletion update.
---

# Borrado de notas — 11 septiembre 2026

## Comportamiento

«Eliminar nota» está disponible en las notas propias de la lista y del post-it para los roles con permiso de borrado existente (`admin`, `admin_limited_tasks`). Primero abre una confirmación con el texto de la nota; solo «Sí, eliminar nota» ejecuta el borrado. No depende del gesto de doble clic, por lo que sirve también con teclado y pantalla táctil.

El servidor exige autenticación, permiso de borrado, propiedad, confirmación explícita y versión vigente. Compartir una nota no permite borrarla. Se eliminan la nota y sus relaciones/historial dependientes; la tarea vinculada se conserva. No hay cambios de esquema.

## Evidencia

| Estado | Resultado |
| --- | --- |
| IMPLEMENTED | `e16a9bdfd7706c10e2ee3ba107a44ccfee7226b4`, en master |
| TESTED | Tipos, lint completo sin errores (un aviso previo de P&L), Drizzle check y build correctos |
| ACTIVE | Publicado 2026-09-11 09:55:58 UTC |
| FUNCTIONING | Sesión real de Pablo: nota existente intacta, botón de borrado visible y tarea enlazada disponible |

Navegador sobre la imagen definitiva, PostgreSQL 17 aislado, contraseñas reales: primer clic no borra, cancelar conserva, versión obsoleta rechazada, confirmación elimina, tarea conservada, dependencias eliminadas, replay sin efecto adicional, nota ajena/compartida rechazada, ausencia de confirmación rechazada, contador del post-it actualizado, móvil dentro del viewport y Alfonso puede borrar su propia nota. Cero errores JS. Los primeros intentos del harness esperaban un elemento oculto por el diálogo; se corrigió para esperar su cierre y verificar la persistencia, y el recorrido completo pasó.

No se borraron notas reales para probar. Eliminados servidor/base/volumen/red/túnel y credenciales de la fixture. Comprobación posterior: cero notas sintéticas de estas pruebas en producción.

## Despliegue y reversión

- Fuente completa: `/home/deploy/socialpro-notes-delete-20260911`, partiendo de `socialpro-kanban-platform-20260911`, conservando todas las mejoras vivas.
- Contenedor: `socialpro-crm-notes-delete-20260911`.
- Imagen: `socialpro:notes-delete-20260911`, digest `sha256:be3a0126601f5a6f8fb63fcf397c4c51b227abc0369c8774a032517d0408c908`.
- Solo se cambió el upstream de SocialPro mediante comparación del hash previo. Hash Caddy final: `1fc26d3ae780a4eb16bfca47ab7c535192442b07df3c7ceba1d125a80b550256`.
- Entorno, montajes, base de datos y scheduler preservados. Readiness público correcto. Credenciales temporales eliminadas.
- Evidencia privada: `/home/deploy/.config/socialpro/notes-delete-20260911/deployment.json` y logs asociados.
- Reversión: devolver únicamente ese upstream al contenedor conservado `socialpro-crm-kanban-platform-20260911`. No restaurar toda la base ni modificar migraciones. Una nota que el usuario haya borrado no reaparece al revertir código.

Master todavía necesita reconciliar las mejoras previas de la fuente viva antes de servir como fuente completa de despliegue; no sustituir esta versión por un checkout incompleto.
