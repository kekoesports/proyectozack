# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
# Worker uses JS-only dependencies. Never run migration/build/seed lifecycle hooks here.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY infra/creator-intake ./infra/creator-intake
COPY infra/contact-register ./infra/contact-register
COPY tsconfig.json ./tsconfig.json
ARG GIT_COMMIT_SHA=unknown
LABEL org.opencontainers.image.revision=$GIT_COMMIT_SHA
ENV NODE_ENV=production NODE_OPTIONS=--max-old-space-size=384
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "--require", "./scripts/worker-preload.cjs", "infra/creator-intake/waha-worker.mjs"]
