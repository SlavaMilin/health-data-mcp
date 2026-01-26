#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
else
  echo "❌ Error: $SCRIPT_DIR/.env not found"
  echo "Copy .env.example to .env and configure it"
  exit 1
fi

# Validate required variables
if [ -z "$DEPLOY_SERVER" ] || [ -z "$DEPLOY_DIR" ] || [ -z "$DOCKER_IMAGE" ]; then
  echo "❌ Error: Missing required environment variables"
  echo "Required: DEPLOY_SERVER, DEPLOY_DIR, DOCKER_IMAGE"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔍 Running type check..."
pnpm typecheck

echo "🧪 Running tests..."
pnpm test:all

echo "🔨 Building image..."
docker build --platform linux/amd64 --progress=plain -t "$DOCKER_IMAGE" .

echo "📤 Pushing to registry..."
docker push "$DOCKER_IMAGE"

echo "📋 Copying docker-compose.yml to server..."
scp docker-compose.yml "$DEPLOY_SERVER:$DEPLOY_DIR/"

echo "🚀 Deploying to server..."
ssh "$DEPLOY_SERVER" << EOF
  cd $DEPLOY_DIR
  docker-compose pull
  docker-compose up -d
  echo "🧹 Cleaning up old images..."
  docker image prune -f
  echo "⏳ Waiting for service to start..."
  echo "🏥 Health check (retrying for 10 seconds)..."
  MAX_ATTEMPTS=10
  ATTEMPT=0
  while [ \$ATTEMPT -lt \$MAX_ATTEMPTS ]; do
    ATTEMPT=\$((ATTEMPT + 1))
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
      echo "✅ Service is healthy"
      break
    fi
    if [ \$ATTEMPT -eq \$MAX_ATTEMPTS ]; then
      echo "❌ Health check failed after \$MAX_ATTEMPTS attempts!"
      exit 1
    fi
    echo "Attempt \$ATTEMPT/\$MAX_ATTEMPTS failed, retrying in 1 second..."
    sleep 1
  done
EOF

echo "✅ Deployed successfully!"
