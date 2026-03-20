# TestLab AI 🧪

Generador y ejecutor de tests unitarios con IA para proyectos JavaScript/TypeScript y Python.

## 🚀 Novedades y Características

### UI/UX (Dashboard)

- **Generación impulsada por IA:** Usa Gemini 2.5 Flash para crear tests unitarios limpios.
- **Carga Rápida:** Botón "📂 Cargar Archivo" para cargar ficheros `.js`, `.ts` o `.py` directamente desde la interfaz, autodetectando el formato.
- **Copiar a Portapapeles:** Copia fácilmente tests generados y logs de ejecución con un click.
- **Terminal ANSI Colorized:** Parseo HTML (`ansi-to-html`) para visualizar el output en vivo de los tests con colores reales en la UI.
- **Métricas de Cobertura y Progreso:** Monitor de métricas en la pestaña COVERAGE actualizadas vía eventos WebSocket con barra de progreso.

### Sandbox Cautivo (Docker)

- **Aislamiento de Red Seguro:** El código se ejecuta dentro de contenedores efímeros usando una red Docker interna (`testlab-isolated`) para prevenir accesos no autorizados al exterior mientras se preserva el acceso localhost (previniendo fallo de `EAI_AGAIN`).
- **Entornos Precargados:**
  - `node`: Vitest 1.6.0.
  - `react`: Vitest + JSDOM y Testing Library.
  - `nextjs`: Base Next.js testing.
  - `python`: `pytest`.

## Stack Tecnológico

- **Frontend**: Next.js 14 + Monaco Editor + Tailwind CSS + Ansi-to-html
- **Backend**: Express + Arquitectura Hexagonal
- **IA**: @google/generative-ai (Gemini)
- **DB**: PostgreSQL (Prisma) para Sesiones y MongoDB (Mongoose) para Logs
- **Comunicaciones**: Socket.io (Eventos de consola y completado en vivo)
- **Infra Sandbox**: Dockerode
- **Deploy**: Hetzner + Nginx + Docker Compose

## Comandos de Desarrollo

```bash
pnpm install      # Instalar dependencias e inicializar git hooks (Husky)
pnpm dev          # Arranca API y Web concurrentemente
pnpm dev:api      # Solo backend (Puerto 3001)
pnpm dev:web      # Solo frontend (Puerto 3000)
pnpm build        # Build de producción de todos los workspaces
pnpm format       # Formatear el código (Prettier)
pnpm lint         # Validación de linting (ESLint)
```

## Setup del Sandbox de Testing

Antes de lanzar una EJECUCIÓN EN VIVO desde la interfaz, es necesario compilar las imágenes locales base del sandbox:

```bash
# 1. Crear red aislada que permite loopback pero no Internet
docker network create --internal testlab-isolated

# 2. Compilar imágenes
cd apps/api/src/infrastructure/sandbox
./build.sh
```

## Git Hooks automáticos

Se dispone de ganchos (Husky) previos al commit:

1. 🔍 **check-secrets** — Asegura que no se suban API Keys como GEMINI_API_KEY.
2. ✨ **Prettier** — Formato garantizado.
3. 🔎 **ESLint** — Calidad de código.
