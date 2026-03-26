#!/bin/sh
set -e

echo "⏳ Ejecutando prisma db push..."
cd /app/api
npx prisma db push --skip-generate

echo "🚀 Arrancando API..."
exec node dist/src/index.js
