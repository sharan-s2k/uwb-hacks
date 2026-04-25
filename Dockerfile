# ─── Stage 1: Build Next.js ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Final image ────────────────────────────────────────────────────
FROM python:3.12-slim

# System deps: Node.js 20, nginx, supervisord, gettext (envsubst)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    nginx \
    supervisor \
    gettext-base \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Backend ──────────────────────────────────────────────────────────────────
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# ── Frontend (standalone build output) ───────────────────────────────────────
WORKDIR /app/frontend
COPY --from=frontend-builder /build/frontend/.next/standalone/frontend/ ./
COPY --from=frontend-builder /build/frontend/.next/standalone/          ./
COPY --from=frontend-builder /build/frontend/.next/static               ./.next/static
COPY --from=frontend-builder /build/frontend/public                     ./public

# ── nginx + supervisord config ────────────────────────────────────────────────
COPY nginx.conf         /etc/nginx/nginx.conf.template
COPY supervisord.conf   /etc/supervisord.conf
COPY start.sh           /start.sh
RUN chmod +x /start.sh

# nginx writes pid/temp files to /tmp — no root needed
RUN mkdir -p /tmp/nginx && chown -R nobody:nogroup /tmp/nginx

EXPOSE 8080

ENTRYPOINT ["/start.sh"]
