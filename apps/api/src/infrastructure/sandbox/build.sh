#!/bin/bash
echo "🚀 Iniciando construcción de imágenes de TestLab AI Sandbox..."

echo "📦 Building testlab-node..."
docker build --network host -t testlab-node -f dockerfiles/Dockerfile.node dockerfiles/

echo "📦 Building testlab-react..."
docker build --network host -t testlab-react -f dockerfiles/Dockerfile.react dockerfiles/

echo "📦 Building testlab-python..."
docker build --network host -t testlab-python -f dockerfiles/Dockerfile.python dockerfiles/

echo "✅ Todas las imágenes construidas correctamente."
