#!/bin/bash

echo "🚀 Iniciando construcción de imágenes de TestLab AI Sandbox..."

# Node base
echo "📦 Building testlab-node..."
docker build -t testlab-node -f dockerfiles/Dockerfile.node .

# React
echo "📦 Building testlab-react..."
docker build -t testlab-react -f dockerfiles/Dockerfile.react .

# Next.js
echo "📦 Building testlab-nextjs..."
docker build -t testlab-nextjs -f dockerfiles/Dockerfile.nextjs .

# Python
echo "📦 Building testlab-python..."
docker build -t testlab-python -f dockerfiles/Dockerfile.python .

echo "✅ Todas las imágenes construidas correctamente."
