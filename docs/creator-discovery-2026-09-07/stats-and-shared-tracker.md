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

### Evaluación open source (07-09-2026)

- `stmn/StreamRadar`: aplicación real para alertas de Twitch, 1 estrella y último commit 10-05-2026. El README dice MIT, pero el repositorio no incluye el texto/archivo de licencia. Sirve como referencia funcional, pero no se copia ni integra.
- `adamwrose/StreamFusion`: 0 estrellas, dos commits del 15-03-2026 y ningún código ejecutable; solo README. Descartado.
- `AskForDax/KickStreamAnalytics`: su licencia prohíbe expresamente el uso por empresas u organizaciones sin permiso escrito. El uso interno de SocialPro también cae en esa prohibición; no se usa su código ni sus datos.

## Colector propio

El VPS sondea cada diez minutos las cuentas activas conocidas y guarda únicamente observaciones de CS2 con fuente y caducidad. Exige conexión oficial, permiso de métricas derivadas y al menos 30 días de retención. La media sigue siendo desconocida hasta acumular una hora medida; después aplica rojo `<70`, amarillo `70–89` y verde `>=90`.
