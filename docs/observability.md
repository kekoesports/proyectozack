---
summary: 'Configuración operativa y de privacidad de Sentry para SocialPro.'
read_when:
  - Configuring production error monitoring
  - Deploying Sentry credentials or source maps
---

# Observabilidad con Sentry

La integración cubre navegador, servidor, Edge y errores no controlados de
Next.js. Permanece desactivada mientras `NEXT_PUBLIC_SENTRY_DSN` no exista.

## Configuración

Crear un proyecto Next.js en Sentry y definir en el build/despliegue:

```dotenv
NEXT_PUBLIC_SENTRY_DSN=https://PUBLIC_KEY@ORG.ingest.sentry.io/PROJECT
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
SENTRY_ORG=organizacion
SENTRY_PROJECT=proyecto
SENTRY_AUTH_TOKEN=token-solo-build
```

El DSN es público por diseño. `SENTRY_AUTH_TOKEN` no lo es: debe existir solo
durante el build y sirve para subir source maps privados. La aplicación no
arranca una grabación de sesión ni captura datos de usuario por defecto.

## Privacidad y volumen

- `sendDefaultPii` está desactivado.
- Antes de enviar un error se eliminan usuario, cookies, cabeceras, cuerpo,
  query string y fragmentos de URL.
- No se habilita Session Replay.
- El muestreo de trazas empieza en 5 % y puede reducirse a `0` sin perder la
  captura de errores.

## Comprobación después del despliegue

1. Verificar que la release aparece en Sentry con source maps asociados.
2. Generar un error sintético en un entorno controlado, nunca con datos reales.
3. Confirmar que el evento contiene la ruta pero no cookies, email, IP,
   autorización ni parámetros de URL.
4. Resolver la incidencia de prueba y comprobar que las alertas llegan al
   canal interno elegido.
