FROM node:24-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV HEALTH_DB_PATH=/app/data/health_data.db

CMD ["pnpm", "start:server"]
