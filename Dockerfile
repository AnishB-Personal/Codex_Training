FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# ---- Runtime image ----
FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app

# Pull patched OS packages (e.g. openssl) to satisfy Trivy HIGH/CRITICAL findings.
RUN apk upgrade --no-cache

# Copy the built app + prod deps.
COPY --from=builder /app /app

# Runtime does not need npm/npx; removing them avoids Trivy findings from npm's bundled deps.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx || true

EXPOSE 3000

CMD ["node", "src/server.js"]
