# Instalación y Operación

---

## Opción A — Docker (recomendado para cualquiera que clone el repo)

### Requisitos

- Docker Desktop (Windows/macOS) o Docker Engine (Linux) corriendo

Comprobación:
```bash
docker info > /dev/null && echo "Docker OK"
```

### Pasos

```bash
# 1. Clonar
git clone <tu-repo>
cd Test_Lab_AI

# 2. Crear .env
cp .env.example .env
nano .env   # rellenar GEMINI_API_KEY y JWT_SECRET

# 3. Levantar todo
docker compose up --build
```

**Primera vez tarda varios minutos** — descarga imágenes, instala dependencias, compila. Las siguientes veces es mucho más rápido porque usa caché.

### Resultado esperado

```
testlab-postgres  | ready to accept connections
testlab-mongo     | Waiting for connections
testlab-api       | ✅ Prisma db push completado
testlab-api       | 🚀 API corriendo en http://localhost:3001
testlab-web       | ✓ Ready in 63ms
```

- Web: http://localhost:3000
- API health: http://localhost:3001/health

---

## Opción B — Desarrollo local con hot reload

Para trabajar con `pnpm dev` y ver cambios en vivo.

### Requisitos

- Node.js 20+
- pnpm 9+
- Docker (solo para las bases de datos)

```bash
node -v       # debe ser 20+
pnpm -v       # debe ser 9+
docker --version
```

### Pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear .env
cp .env.example .env
# Editar .env — en desarrollo los hosts son localhost, no los nombres Docker

# 3. Levantar bases de datos
docker compose up postgres mongo -d

# 4. Preparar Prisma (solo la primera vez)
cd api
npx prisma generate
npx prisma db push
cd ..

# 5. Crear red Docker para sandboxes (solo la primera vez)
docker network create --internal testlab-isolated || true

# 6. Arrancar
pnpm dev
```

---

## Variables de entorno — explicación clara

Solo hay UN archivo `.env` en la raíz del proyecto. Contiene todo.

**Diferencia clave entre Docker y desarrollo local:**

| Variable | Docker | Desarrollo local |
|----------|--------|-----------------|
| `DATABASE_URL` | `@postgres:5432` | `@localhost:5434` |
| `MONGODB_URI` | `mongodb://mongo:27017` | `mongodb://localhost:27020` |

En Docker los contenedores se hablan por nombre (`postgres`, `mongo`).
En local, las DBs están expuestas en puertos de tu máquina (`localhost:5434`, `localhost:27020`).

### Contenido del `.env`

```dotenv
# ── Postgres ───────────────────────────────────────────────────────────
POSTGRES_USER=testlab
POSTGRES_PASSWORD=testlab123
POSTGRES_DB=testlab

# ── Base de datos ──────────────────────────────────────────────────────
# Para Docker:
DATABASE_URL="postgresql://testlab:testlab123@postgres:5432/testlab"
# Para desarrollo local (cambiar @postgres por @localhost:5434):
# DATABASE_URL="postgresql://testlab:testlab123@localhost:5434/testlab"

# Para Docker:
MONGODB_URI="mongodb://mongo:27017/testlab"
# Para desarrollo local:
# MONGODB_URI="mongodb://localhost:27020/testlab"

# ── IA ─────────────────────────────────────────────────────────────────
GEMINI_API_KEY="tu-api-key-real"
NEXT_PUBLIC_GEMINI_API_KEY="tu-api-key-real"

# ── Auth ───────────────────────────────────────────────────────────────
JWT_SECRET="un-string-largo-y-aleatorio"

# ── App ────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production   # cambiar a development para modo local

# ── Web ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# ── Postgres (para docker compose) ────────────────────────────────────
POSTGRES_USER=testlab
POSTGRES_PASSWORD=testlab123
POSTGRES_DB=testlab
```

---

## Comandos útiles

### Docker

```bash
# Levantar todo (con rebuild)
docker compose up --build

# Levantar todo (sin rebuild, más rápido si no hay cambios)
docker compose up

# Solo las bases de datos
docker compose up postgres mongo -d

# Ver logs de un servicio
docker compose logs -f api
docker compose logs -f web

# Parar todo (conserva datos)
docker compose down

# Parar y borrar datos (reset total)
docker compose down -v

# Rebuild de un servicio concreto
docker compose build api
docker compose up api --force-recreate
```

### Desarrollo local

```bash
pnpm dev           # arranca api + web en paralelo
pnpm dev:api       # solo api
pnpm dev:web       # solo web
pnpm db:up         # levanta postgres + mongo
pnpm db:down       # para postgres + mongo
pnpm db:reset      # borra y recrea los volúmenes
```

### Prisma

```bash
cd api
npx prisma generate        # genera el cliente
npx prisma db push         # sincroniza schema con la DB
npx prisma studio          # interfaz visual de la DB
```

---

## Troubleshooting

### La web no carga / ERR_CONNECTION_REFUSED en :3000

```bash
docker compose ps
```
Si `testlab-web` no aparece o está en estado `Restarting`:
```bash
docker compose logs web
```

### La API falla con "docker.sock not found"

El socket de Docker no está montado. Verifica que en `docker-compose.yml` el servicio `api` tenga:
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

Verifica que `api/prisma/schema.prisma` tenga en el datasource:
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
```
Cierra el proceso que ocupa el puerto o para los contenedores con `docker compose down`.