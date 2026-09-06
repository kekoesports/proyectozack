---
read_when: using Studio as agency staff, changing Studio permissions, or deploying its workers
---

# Content Studio: edición de agencia

## Recorrido

1. Entrar en `/admin/studio` con una cuenta existente **admin o manager**.
2. Buscar un talento del CRM y pulsar **Abrir Studio**.
3. Comprobar el aviso **Editando para [talento]**. Crear un proyecto, preparar
   el guion, subir material con derechos y guardar el montaje.
4. Ver la animación y exportar MP4. El resultado llega a **Revisión** como
   recurso privado. Exportar no aprueba ni publica el vídeo.
5. **Volver a la agencia** cierra la selección. Elegir otro talento para cambiar
   de espacio; no hace falta crearle una cuenta para preparar un borrador.

No se amplían automáticamente los permisos del resto de roles del CRM. El
creador sigue entrando mediante su propia invitación y cuenta verificada.
La selección de agencia no crea membresías, no suplanta al creador y no cambia
sus accesos. Un registro del CRM no implica consentimiento para clonar su voz
o rostro: debe verificarse antes de cualquier generación.

## Límites de esta entrega

- El montaje conserva archivos existentes. HyperFrames/FFmpeg no sintetizan
  rostros ni voces; exportar así consume servidor, no créditos Higgsfield.
- Las ayudas editoriales funcionan por reglas. El chat IA libre necesita su
  proveedor; una clave Google ya utilizada por el CRM no lo conecta por sí sola.
- Higgsfield sigue apagado. El coste de narración requiere una cotización
  vigente y aprobación explícita; no hay compras ni reintentos automáticos.
- Estadísticas y campañas pertenecen al talento seleccionado. Datos ausentes
  no se presentan como cero ni como resultados de una campaña inventada.
- La identidad personal del piloto KEKO no se asigna a otro talento. Su
  incorporación privada sigue pendiente de un espacio propio correcto.

## Controles de aislamiento

La cookie `studio-agency-workspace` solo selecciona: HttpOnly, Secure en HTTPS,
SameSite=Lax, host-only y ocho horas. Cada consulta vuelve a comprobar el rol
real en la base de datos y limita la selección a un solo talento. Un creador
o rol limitado no obtiene permisos enviando esa cookie ni un talent ID.

Las mutaciones incluyen el ID del espacio renderizado en la página. Si otra
pestaña cambia la selección, la antigua recibe «El espacio cambió» antes de
guardar, subir, solicitar un render, narración o aplicar una propuesta.
La biblioteca privada deja de servir los archivos del espacio anterior.

Proyectos y recursos registran al usuario real en `createdBy`,
`rightsConfirmedBy` y `requestedBy`. Los trabajadores no tienen cookies:
`studioJobRepository` obtiene la selección desde el proyecto en cola y vuelve
a verificar la autoridad del solicitante. La revocación sigue cerrando acceso.
No hay cambios de esquema ni migraciones nuevas.

## Verificación

- 45 controles de agencia y trabajadores, 42 de aislamiento y 39 de producción
  sobre PostgreSQL en memoria, sin proveedores ni base real. Incluidos en CI.
- 36 tests de entrada, cookie y upload; TypeScript y lint completos.
- Navegador sobre clon PostgreSQL 17 aislado y misma imagen web: login de
  agencia, abrir talento, crear proyecto, guardar HyperFrames, ayuda editorial,
  solicitar render y reproducir MP4 privado 720×1280. Autor real conservado y
  ninguna membresía de agencia creada.
- Cambio de talento en segunda pestaña: el guardado antiguo rechazado y su
  vídeo devuelve 404; el proyecto no se mueve. Móvil 390 px sin overflow.
- Worker de ensayo con las mismas restricciones de producción: red interna,
  sin proveedores, raíz de solo lectura, 2 CPU/2 GiB y almacenamiento privado.

El estado de publicación y las imágenes exactas están en
`docs/studio-release-2026-09-06.md`; estas pruebas no equivalen a habilitar IA,
Higgsfield, publicación automática ni métricas privadas OAuth.
