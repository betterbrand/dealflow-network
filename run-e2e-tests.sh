#!/bin/bash
# Script to run E2E tests with proper setup

echo "🚀 Starting E2E Test Environment..."

# Step 1: Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Step 2: Stop any process using port 3000
echo "📍 Checking port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Step 3: Start Docker Compose
echo "🐳 Starting Docker Compose..."
docker compose up -d

# Step 4: Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Server failed to start within 30 seconds"
    docker compose logs app --tail 50
    exit 1
  fi
  sleep 1
done

# Step 5: Run tests
echo "🧪 Running E2E tests..."
if [ "$1" == "--ui" ]; then
  npm run test:e2e:ui
elif [ "$1" == "--headed" ]; then
  npm run test:e2e:headed
else
  npm run test:e2e
fi
