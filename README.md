# Aplicación — Funcionalidad y Stack

---

## ¿Qué es TestLab AI?

TestLab AI es una plataforma web que permite a los desarrolladores generar tests unitarios automáticamente usando IA y ejecutarlos en contenedores Docker aislados, con visualización de resultados en tiempo real.

### Flujo principal

1. El usuario pega o carga su código fuente en el editor
2. La IA (Gemini) analiza el código y genera una suite de tests completa
3. El usuario ejecuta los tests — se lanza un contenedor sandbox efímero
4. Los logs de ejecución aparecen línea a línea en el terminal de la app via WebSocket
5. El resultado final se guarda en MongoDB para trazabilidad

---

## Características

- **Generación de tests con IA** — Gemini analiza el código y propone tests unitarios completos con mocks, casos edge y aserciones
- **Sandbox Docker aislado** — Los tests corren en contenedores efímeros con red interna sin acceso exterior
- **Streaming en tiempo real** — Los logs aparecen línea a línea via WebSocket mientras se ejecutan
- **Multi-lenguaje** — Soporte para Node.js, React, Next.js y Python
- **Chat contextual** — Conversa con la IA sobre tu código, tests y resultados de ejecución
- **Autenticación JWT** — Registro e inicio de sesión con tokens seguros
- **Historial de sesiones** — Las sesiones de test se guardan en PostgreSQL

---

## Stack tecnológico

### Frontend (`apps/web`)

| Tecnología | Uso |
|-----------|-----|
| Next.js 14 | Framework React con SSR |
| React 18 | UI components |
| TypeScript | Tipado estático |
| Tailwind CSS | Estilos |
| Monaco Editor | Editor de código en el navegador |
| Socket.io client | Streaming de logs en tiempo real |
| Axios | Llamadas HTTP a la API |

### Backend (`api`)

| Tecnología | Uso |
|-----------|-----|
| Node.js + Express | Servidor HTTP |
| TypeScript | Tipado estático |
| Prisma + PostgreSQL | Persistencia de usuarios y sesiones |
| Mongoose + MongoDB | Logs de ejecución |
| Socket.io | WebSockets para streaming |
| Dockerode | Control de contenedores Docker desde Node |
| Zod | Validación de entrada |
| JWT + bcrypt | Autenticación |

### IA

| Tecnología | Uso |
|-----------|-----|
| Google Gemini | Generación de tests y chat contextual |
| `@google/generative-ai` | SDK oficial |

### Infraestructura

| Tecnología | Uso |
|-----------|-----|
| Docker Compose | Orquestación de servicios |
| Docker | Contenedores de sandbox para ejecución |
| Red `testlab-isolated` | Aislamiento de red para sandboxes |

---

## API REST

Base path: `/api`

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro de nuevo usuario |
| POST | `/auth/login` | Login, devuelve JWT |

### Tests

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/tests/generate` | Genera tests con IA para el código enviado |
| POST | `/tests/run` | Ejecuta los tests en un sandbox Docker |

### Chat

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/chat` | Chat contextual sobre código y tests |

### Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check del servidor |

---

## WebSockets

La ejecución de tests usa WebSockets para streaming en tiempo real. Canal por `sessionId`:

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `test:join` | Cliente → Servidor | Suscribirse a una sesión |
| `test:joined` | Servidor → Cliente | Confirmación de suscripción |
| `test:output` | Servidor → Cliente | Línea de terminal en vivo |
| `test:complete` | Servidor → Cliente | Fin de ejecución + resumen |

---

## Persistencia

### PostgreSQL (Prisma) — datos operativos

- **`User`** — email, contraseña hasheada, plan, fecha de creación
- **`TestSession`** — código original, tests generados, estado, lenguaje, metadata

Estados de `TestSession`:
```
PENDING → RUNNING → PASSED
                  → FAILED
                  → ERROR
```

### MongoDB (Mongoose) — logs ricos

Colección `TestRunLog`:
- Salida cruda completa del runner
- Suites y tests parseados
- Duración y resumen
- Referenciado desde `TestSession` via `mongoLogId`

---

## Seguridad

- Tests ejecutados en contenedores efímeros — se destruyen tras la ejecución
- Red Docker interna `testlab-isolated` sin acceso a internet para los sandboxes
- Límites de recursos por contenedor (memoria/CPU) y timeout de ejecución
- Autenticación JWT para endpoints protegidos
- Validación de entrada con Zod en todos los endpoints

---

## Entornos de runtime disponibles

| Entorno | Imagen Docker |
|---------|--------------|
| Node.js | `testlab-node:latest` |
| React | `testlab-react:latest` |
| Next.js | `testlab-nextjs:latest` |
| Python | `testlab-python:latest` |

Las imágenes se construyen automáticamente al hacer `docker compose up --build` via el servicio `sandbox-builder`.

---

## Limitaciones actuales

- La cobertura mostrada depende del parseo de la salida del runner
- El frontend puede usar Gemini directamente en cliente para algunas acciones de chat
- `packages/shared` preparado para crecimiento pero no centraliza todos los contratos todavía
- Sin OpenAPI/Swagger — los contratos HTTP son implícitos