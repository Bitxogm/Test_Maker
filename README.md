# TestLab AI 🧪

Generador y ejecutor de tests con IA para proyectos JavaScript/TypeScript y Python.

## Stack

- **Frontend**: Next.js 14 + Monaco Editor + Tailwind + shadcn/ui
- **Backend**: Express + Arquitectura Hexagonal
- **IA**: Gemini 2.5 Flash
- **DB**: PostgreSQL (Prisma) + MongoDB (Mongoose)
- **Real-time**: Socket.io
- **Sandbox**: Docker SDK
- **Deploy**: Hetzner + Nginx + Docker Compose

## Comandos

```bash
pnpm install      # instalar dependencias + activar git hooks
pnpm dev          # arranca api + web en paralelo
pnpm dev:api      # solo backend
pnpm dev:web      # solo frontend
pnpm build        # build de todos los workspaces
pnpm format       # formatear con prettier
pnpm lint         # eslint en todos los workspaces
```

## Git Hooks (automáticos)

Antes de cada commit:
1. 🔍 check-secrets — detecta API keys y passwords
2. ✨ Prettier — formatea el código
3. 🔎 ESLint — valida la calidad del código
