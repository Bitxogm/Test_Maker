# TestLab AI

Plataforma para generar tests unitarios con IA y ejecutarlos en sandbox Docker aislado, con visualización en tiempo real.

## Documentación

- [docs/INSTALLATION.md](docs/INSTALLATION.md) — cómo levantar el proyecto
- [docs/APPLICATION.md](docs/APPLICATION.md) — funcionalidad y stack
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arquitectura y diagramas

---

## Quickstart — Docker (recomendado)

**Requisito único: tener Docker instalado y corriendo.**

```bash
# 1. Clonar
git clone <tu-repo>
cd Test_Lab_AI

# 2. Crear el .env (solo una vez)
cp .env.example .env
# Editar .env y rellenar GEMINI_API_KEY y JWT_SECRET

# 3. Levantar todo
docker compose up --build
```

Eso es todo. La app estará disponible en:

- Web: http://localhost:3000
- API: http://localhost:3001/health

---

## Quickstart — Desarrollo local (sin Docker para la app)

Si prefieres trabajar con hot reload y `pnpm dev`:

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear los .env de desarrollo
cp .env.example .env
# Editar .env con los valores de desarrollo (hosts localhost)

# 3. Levantar solo las bases de datos
docker compose up postgres mongo -d

# 4. Preparar Prisma
cd api && npx prisma generate && npx prisma db push && cd ..

# 5. Crear red Docker para sandboxes
docker network create --internal testlab-isolated || true

# 6. Arrancar en modo dev
pnpm dev
```

---

## Estructura

```
Test_Lab_AI/
├─ api/              ← Backend Express (fuera del workspace pnpm)
├─ apps/web/         ← Frontend Next.js
├─ packages/shared/  ← Tipos compartidos
├─ docs/             ← Documentación
├─ docker-compose.yml
├─ .env.example      ← Plantilla de variables
└─ .env              ← Tu entorno real (NO commitear)
```

## Archivos .env — regla clara

| Archivo | Cuándo se usa |
|---------|---------------|
| `.env` | Siempre — Docker Compose y desarrollo local |
| `.env.example` | Plantilla — se commitea, sin valores reales |

> Los `.env.local` antiguos de `apps/api` y `apps/web` ya no son necesarios con esta configuración.