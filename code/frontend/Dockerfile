# syntax=docker/dockerfile:1
# ------------------------------
# Stage 1: Build
# ------------------------------
FROM node:22-alpine AS builder

WORKDIR /app/frontend

# Install deps including devDependencies (Vite); avoid NODE_ENV=production skipping them
ENV NODE_ENV=development
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy frontend source and build
COPY frontend/ ./
COPY shared/ /app/shared/
RUN ./node_modules/.bin/vite build

# ------------------------------
# Stage 2: Production
# ------------------------------
FROM nginx:alpine

# tini as PID 1; curl for healthcheck
RUN apk add --no-cache tini curl

# Frontend configuration is included in the shared ./code build context.
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Non-root (nginx alpine uses nginx user; ensure dir is writable if needed)
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

# Alpine installs tini to /sbin/tini (not /usr/bin/tini)
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
