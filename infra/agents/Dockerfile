# Imagen del worker de agentes.
#
# No es la imagen de la web con otro comando: el worker no necesita el build de
# Next.js, ni sus assets, ni el servidor HTTP. Una imagen propia es más pequeña,
# arranca antes y tiene menos superficie.
#
# Ejecuta TypeScript con tsx en vez de compilar a JavaScript. La alternativa
# —un paso de build— añadiría configuración de tsconfig, mapas de fuentes y una
# fuente más de divergencia con el código que corre en Next.js. El coste es un
# arranque algo más lento, que en un proceso de larga vida no importa.

FROM node:24-alpine AS base

# dumb-init reenvía las señales correctamente. Sin él, el proceso de Node es el
# PID 1 y no recibe SIGTERM como se espera, así que el apagado ordenado —el que
# suelta los leases— nunca llega a ejecutarse.
RUN apk add --no-cache dumb-init

WORKDIR /app

# Dependencias primero, para que la capa se reutilice entre despliegues.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Solo lo que el worker necesita.
COPY tsconfig.json ./
COPY src/lib ./src/lib
COPY src/db ./src/db
COPY src/types ./src/types
COPY src/worker ./src/worker
COPY scripts/worker-preload.cjs ./scripts/worker-preload.cjs

# Usuario sin privilegios. El worker no escribe en disco ni necesita root para
# nada; que no lo tenga limita el daño de cualquier fallo.
USER node

ENV NODE_ENV=production

# Sin EXPOSE: el worker no escucha en ningún puerto.

ENTRYPOINT ["dumb-init", "--"]
# El preload neutraliza `server-only`, que lanza en cualquier proceso de Node
# fuera de Next. Ver scripts/worker-preload.cjs.
CMD ["npx", "tsx", "--require", "./scripts/worker-preload.cjs", "src/worker/agent-worker.ts"]
