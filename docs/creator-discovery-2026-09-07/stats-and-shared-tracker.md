# Leads CC: memoria compartida y estadísticas de directos

## Registro operativo

- Hoja: [SocialPro · Leads CC](https://docs.google.com/spreadsheets/d/1YaiCqKeMb8BlJoZJKU4x-gEYRW8-sjOVR_bJ65teF3A/edit).
- El CRM conserva la identidad, el estado y el historial canónicos; la hoja permite al equipo editar calidad, estado, responsable y notas.
- Un descarte se suprime durante seis meses naturales. Pasado ese plazo queda **elegible para revisión**, no recomendado automáticamente.
- Una reapertura automática sigue limitada a evidencia verificable de mejora; los motivos comerciales/manuales requieren decisión humana.

## Fuentes de audiencia

- Twitch Helix y la API oficial de Kick aportan la categoría y audiencia del directo actual. Una instantánea no es una media de 30 días.
- La solución gratuita y controlable es muestrear periódicamente las cuentas candidatas, guardar `platform`, ID inmutable, categoría, audiencia, instante y estado live, y calcular la media ponderada por tiempo únicamente sobre intervalos de CS2 de los últimos 30 días.
- Streams Charts sirve como contraste histórico mediante API autenticada y créditos. No se integra como dependencia gratuita.
- KickStats, Streams Charts web y otros sitios sin una API/licencia estable no deben convertirse en scrapers de producción.
- Herramientas open source pueden acelerar el colector o el panel, pero no sustituyen la API oficial ni acreditan por sí solas derechos de retención/comercialización. Antes de activarlo se mantienen los gates de permisos de proveedor ya existentes.

## Siguiente implementación segura

1. Reutilizar el cron/VPS y credenciales oficiales ya validadas para muestrear Twitch y Kick cada 5–10 minutos.
2. Guardar muestras en una tabla temporal/retencionada con fuente y cobertura explícitas.
3. Calcular `averageCs2Viewers30d` solo si la cobertura mínima definida se cumple; si no, devolver `null` y mantener amarillo.
4. Mostrar fuente, ventana, cobertura y última actualización en Leads CC y en la hoja compartida.
