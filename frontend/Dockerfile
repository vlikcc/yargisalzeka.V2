# Multi-stage build for Vite + React app

# 1) Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Optional: allow overriding API base URL at build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# 2) Runtime stage (nginx)
FROM nginx:1.27-alpine AS runtime

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default HTTP port
EXPOSE 80

# Healthcheck (optional)
HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
