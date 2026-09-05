# syntax=docker/dockerfile:1.7
#
# Imagen de producción de SocialPro.
#
# Debian slim, no Alpine. No es preferencia: `canvas` compila contra glibc y
# necesita cairo/pango del sistema, y los WASM de mupdf y tesseract se han
# probado sobre glibc. En musl habría que recompilar y revalidar el OCR entero
# para ahorrar unos megas de imagen — mal negocio.
#
# Construir con el SHA de git para que la imagen sea rastreable:
#   docker build --build-arg GIT_COMMIT_SHA=$(git rev-parse HEAD) \
#                -t socialpro:$(git rev-parse --short HEAD) .

ARG NODE_VERSION=24-bookworm-slim

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Cabeceras y toolchain para compilar `canvas`. Solo en esta capa: no llegan a
# la imagen final.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential python3 pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# `npm ci` respeta el lockfile: build reproducible.
RUN --mount=type=cache,target=/root/.npm npm ci

# ── migrations ──────────────────────────────────────────────────────────────
# Imagen separada para aplicar migraciones antes de arrancar la web. La imagen
# final es deliberadamente minima y no incluye `tsx`, las migraciones ni el
# arbol de fuentes; por eso nunca debe usarse como migrador.
FROM deps AS migrator
WORKDIR /app

COPY . .

ENV NODE_ENV=production
USER node

CMD ["npm", "run", "migrate:deploy"]

# ── build ───────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

ARG GIT_COMMIT_SHA=unknown
ARG APP_VERSION=unknown
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA} APP_VERSION=${APP_VERSION}

# Las NEXT_PUBLIC_* se incrustan en el bundle durante el build: si faltan aquí,
# no hay forma de inyectarlas después arrancando el contenedor.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# El build NO aplica migraciones: eso lo hace `migrate:deploy` como paso
# separado del despliegue. Un build no debe poder tocar la base.
#
# Next.js requiere configuración mínima de compilación para validar variables y
# prerenderizar. Usar un entorno dedicado y una conexión de sólo lectura, nunca
# el archivo general de producción con claves de bancos u otros módulos.
# El secreto BuildKit evita persistirlo en contexto, historial o capas de imagen.
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=build_env,target=/app/.env.production,required=true \
    export PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=15000' \
      DB_POOL_MAX=2 DB_STATEMENT_TIMEOUT_MS=15000 NODE_OPTIONS='--max-old-space-size=3072' \
    && node --env-file=/app/.env.production scripts/assert-readonly-build.cjs \
    && npm run build

# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# Solo las librerías de ejecución de canvas/rsvg, sin el toolchain de compilación.
# `tini` da un PID 1 de verdad que reenvía señales: sin él, SIGTERM no llega a
# Node y el contenedor muere por timeout en vez de cerrar ordenadamente.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      tini wget \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

ARG GIT_COMMIT_SHA=unknown
ARG APP_VERSION=unknown
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA} APP_VERSION=${APP_VERSION}

# Usuario sin privilegios. La imagen de Node ya trae `node` (uid 1000).
USER node

# `output: standalone` deja en .next/standalone el servidor con sus
# dependencias trazadas; no hace falta copiar node_modules entero.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Datos de Tesseract (~8,5 MB). Se copian aparte porque viven en la raíz del
# repo, no bajo public/, y el trazado de standalone no los recoge.
COPY --from=build --chown=node:node /app/eng.traineddata /app/spa.traineddata ./
COPY --from=build --chown=node:node /app/scripts/docker-runtime-smoke.mjs ./scripts/docker-runtime-smoke.mjs

EXPOSE 3000

# Comprueba liveness, que no toca la base: un contenedor sano con la base caída
# no debe reiniciarse en bucle.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health/live || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
