# WhatsApp: comprobación y respuesta pendiente — 14 septiembre 2026

## Resultado para SocialPro

El contacto pendiente recibió una respuesta aceptada por WhatsApp a las **10:51:50, hora de Madrid**. Se utilizó literalmente el saludo publicado y aprobado. El contacto está habilitado para continuar con el asistente. No se ha acreditado que haya leído la respuesta ni se ha observado todavía su siguiente mensaje.

El problema era de alcance: solo el teléfono personal del propietario estaba habilitado para respuestas automáticas. El otro contacto se había conservado para atención humana; devolverlo al asistente no habilitaba su número ni reproducía el mensaje antiguo.

El propietario autorizó hoy añadir únicamente ese contacto y responder a su mensaje original. El piloto tiene ahora **dos contactos**. Los demás siguen fuera de las respuestas automáticas. El límite no cambia: 30 reservas de IA, 22 utilizadas, ocho restantes. Esta respuesta inicial es determinista y no consumió IA.

## Evidencia observada en producción

- Sesión autenticada `WORKING`, identidad de empresa correcta, un webhook `message.any` al worker de recuperación.
- Respuesta persistida `accepted`: 2026-09-14 08:51:50.935 UTC.
- Eco real de WAHA recibido 08:51:50.991 y procesado 08:51:51.913 UTC. El eco fue reconocido como envío propio del asistente y no activó atención humana.
- Repetición explícita de la misma operación: `duplicate: true`, una sola respuesta persistida y ningún segundo envío.
- Estado del contacto: `bot`, versión 3; un mensaje original del creador, ningún mensaje nuevo inventado. Fecha original conservada: 2026-09-13 03:41:17 UTC.
- Salud medida 08:52:17 UTC: cero duplicados lógicos, cero mensajes pendientes de procesar, cero fallos, cero entregas inciertas, **cero conversaciones sin respuesta**. Otro contacto permanece en atención humana por su control previo, sin reabrirlo.
- No se generaron datos TEST en producción durante esta comprobación.

## Cambios y reversión

Se conserva el código e imagen de web y worker del cierre de ayer. Se recrearon los dos contenedores con sus configuraciones completas, cambiando solamente `CREATOR_INTAKE_WHATSAPP_CHATS`; imagen, volúmenes, redes, salud, presupuesto y demás variables se comprobaron iguales. Los nombres activos no cambian:

- `socialpro-crm-whatsapp-5fe20fe7`
- `socialpro-waha-reliability`

Los contenedores previos compatibles quedan detenidos con sufijo `-before-contact-20260914`. Copias privadas de configuración y `pg_dump` de las tablas `intake_*`, autorización acotada y comprobantes permanecen en `/home/deploy/.config/socialpro/whatsapp-followup-20260914/`, con permisos privados. No se ejecutó DDL ni restauración. El helper `infra/creator-intake/enable-approved-contact.py` permite revertir configuración con la fase `rollback`; no debe restaurarse el dump para deshacer una respuesta real. Un mensaje enviado no se puede revertir restaurando configuración.

`scripts/resume-approved-whatsapp-greeting.mjs` implementa una operación administrativa excepcional para **un saludo inicial expresamente aprobado**. Exige contacto habilitado, identidad canónica correcta, versión y mensaje exactos, hash del saludo aprobado, autorización reciente, un único mensaje del creador y ausencia de efectos previos. Persiste una reserva antes del envío, mantiene el bloqueo durante el transporte, conserva el recibo e impide repetirlo. Una entrega incierta exige revisión. No reenvía historia ni modifica fechas para eludir la antigüedad. Usa el emisor original y no incorpora claves al código.

La acción habitual «Devolver al asistente» sigue destinada al siguiente mensaje nuevo: esta intervención no añade un botón general para reproducir conversaciones antiguas. Una reapertura histórica distinta requiere revisar su contexto y autorización.

## Verificación y límites

**IMPLEMENTADO:** ampliación autorizada a un contacto y recuperación administrativa acotada del saludo.

**PROBADO:** 25 pruebas existentes de saludo, conocimiento, controles, normalización y envío; pruebas del monitor sobre servicios simulados; preview rechazada fuera del piloto y aceptada tras habilitarlo; envío real, persistencia, eco real y repetición sin segundo envío. Las pruebas unitarias usan dobles de proveedores. No se provocó una caída real del VPS ni una desconexión del teléfono hoy.

**ACTIVO:** web y worker con dos contactos habilitados, sesión de empresa conectada, receptor y monitor activos.

**FUNCIONANDO EN EL RECORRIDO OBSERVADO:** mensaje original conservado → saludo aprobado → envío aceptado → eco real procesado → ausencia de duplicado → monitor sin conversaciones pendientes. La respuesta siguiente del creador y una extracción nueva con IA aún no se han observado hoy. El saludo y catálogo público no se editaron.

Persiste un aviso ajeno a esta respuesta: doce filas ambiguas del registro de contactos en Drive necesitan revisar identidad. No se fusionaron ni borraron por conjeturas. El monitor en el VPS no cubre una caída completa del propio host.
