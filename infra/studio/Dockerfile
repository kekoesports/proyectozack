# Offline media worker. No public ports and no Higgsfield account in this image.
FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev ffmpeg chromium tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY public/fonts/studio ./public/fonts/studio
COPY public/images/logos/socialpro-full.png ./public/images/logos/socialpro-full.png
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HYPERFRAMES_NO_TELEMETRY=1 \
    DO_NOT_TRACK=1 HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium \
    STUDIO_FFMPEG_BIN=/usr/bin/ffmpeg STUDIO_FFPROBE_BIN=/usr/bin/ffprobe
USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "run", "studio:worker"]
