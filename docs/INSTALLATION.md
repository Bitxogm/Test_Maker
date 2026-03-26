# Instalación y Operación

---

## Archivos .env — antes de empezar

Este proyecto necesita dos archivos `.env`. **Ninguno se crea solo**, hay que copiarlos manualmente:

| Archivo | Copiado de | Cuándo se necesita |
|---------|-----------|-------------------|
| `.env` | `.env.example` | **Siempre** — Docker y desarrollo local |
| `api/.env` | `api/.env.example` | Solo desarrollo local con `pnpm dev` |

---

## Opción A — Docker (recomendado)

**Requisito único: Docker instalado y corriendo.**

Comprobación:
```bash
docker info > /dev/null && echo "Docker OK"
```

### Pasos

```bash
# 1. Clonar
git clone <tu-repo>
cd Test_Lab_AI

# 2. Crear el .env (solo una vez)
cp .env.example .env
nano .env
# → Rellenar GEMINI_API_KEY y JWT_SECRET con valores reales
# → El resto ya está configurado para Docker, no tocar

# 3. Levantar todo
docker compose up --build
```

Primera vez tarda varios minutos. Las siguientes es mucho más rápido por el caché.

### Resultado esperado

```
testlab-api  | ⏳ Ejecutando prisma db push...
testlab-api  | 🚀 Arrancando API...
testlab-api  | 📦 MongoDB conectado con éxito
testlab-api  | 🚀 API corriendo en http://localhost:3001
testlab-web  | ✓ Ready in 63ms
```

- Web: http://localhost:3000
- API health: http://localhost:3001/health

---

## Opción B — Desarrollo local con hot reload

Para trabajar con `pnpm dev` y ver cambios en tiempo real.

### Requisitos

- Node.js 20+, pnpm 9+, Docker (solo para las DBs)

```bash
node -v && pnpm -v && docker --version
```

### Pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear los DOS archivos .env
cp .env.example .env
nano .env
# → Cambiar los hosts Docker por hosts locales:
#   DATABASE_URL: @postgres:5432  →  @localhost:5434
#   MONGODB_URI:  mongodb://mongo  →  mongodb://localhost:27020
#   NODE_ENV: production  →  development

cp api/.env.example api/.env
nano api/.env
# → Rellenar GEMINI_API_KEY y JWT_SECRET con valores reales

# 3. Levantar solo las bases de datos
docker compose up postgres mongo -d

# 4. Preparar Prisma (solo la primera vez)
cd api && npx prisma generate && npx prisma db push && cd ..

# 5. Crear red Docker para sandboxes (solo la primera vez)
docker network create --internal testlab-isolated || true

# 6. Arrancar
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

---

## Variables de entorno — diferencia clave

En Docker los servicios se hablan por nombre de contenedor.
En local, las DBs están expuestas en puertos de tu máquina.

| Variable | Docker | Desarrollo local |
|----------|--------|-----------------|
| `DATABASE_URL` | `@postgres:5432` | `@localhost:5434` |
| `MONGODB_URI` | `mongodb://mongo:27017` | `mongodb://localhost:27020` |

### `.env` (raíz) — para Docker

```dotenv
# ── Postgres ───────────────────────────────────────────────────────────
POSTGRES_USER=testlab
POSTGRES_PASSWORD=testlab123
POSTGRES_DB=testlab

# ── Base de datos — hosts Docker ───────────────────────────────────────
DATABASE_URL="postgresql://testlab:testlab123@postgres:5432/testlab"
MONGODB_URI="mongodb://mongo:27017/testlab"

# ── IA ─────────────────────────────────────────────────────────────────
GEMINI_API_KEY="tu-api-key-real"
NEXT_PUBLIC_GEMINI_API_KEY="tu-api-key-real"

# ── Auth ───────────────────────────────────────────────────────────────
JWT_SECRET="un-string-largo-y-aleatorio"

# ── App ────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production

# ── Web ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### `api/.env` — para desarrollo local

```dotenv
# ── Base de datos — hosts locales ──────────────────────────────────────
DATABASE_URL="postgresql://testlab:testlab123@localhost:5434/testlab"
MONGODB_URI="mongodb://localhost:27020/testlab"

# ── IA ─────────────────────────────────────────────────────────────────
GEMINI_API_KEY="tu-api-key-real"

# ── Auth ───────────────────────────────────────────────────────────────
JWT_SECRET="un-string-largo-y-aleatorio"

# ── App ────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

---

## Comandos útiles

### Docker

```bash
docker compose up --build          # levantar todo (con rebuild)
docker compose up                  # levantar todo (sin rebuild)
docker compose up postgres mongo -d # solo las DBs
docker compose logs -f api         # logs de la API en vivo
docker compose logs -f web         # logs del frontend en vivo
docker compose down                # parar (conserva datos)
docker compose down -v             # parar y borrar datos
docker compose build api           # rebuild de un servicio
docker compose up api --force-recreate
```

### Desarrollo local

```bash
pnpm dev        # arranca api + web en paralelo
pnpm dev:api    # solo api
pnpm dev:web    # solo web
pnpm db:up      # levanta postgres + mongo
pnpm db:down    # para postgres + mongo
pnpm db:reset   # borra y recrea los volúmenes
```

### Prisma

```bash
cd api
npx prisma generate   # genera el cliente (obligatorio tras cambios en schema)
npx prisma db push    # sincroniza schema con la DB
npx prisma studio     # interfaz visual de la DB en el navegador
```

---

## Troubleshooting

### La web no carga en localhost:3000

```bash
docker compose ps                  # ver estado de todos los contenedores
docker compose logs web            # ver por qué falla
```

### Error "docker.sock not found" en la API

El socket de Docker no está montado. Verifica que `docker-compose.yml` tenga en el servicio `api`:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### Error "network testlab-isolated not found"

```bash
docker network create --internal testlab-isolated
docker compose up api --force-recreate
```

### Error Prisma "url missing"

Verifica que `api/prisma/schema.prisma` tenga:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Puerto ocupado (3000 / 3001)

```bash
lsof -i :3000
lsof -i :3001
# Cierra el proceso o para los contenedores con docker compose down
```