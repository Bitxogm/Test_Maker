#!/usr/bin/env bash

# ================================================================
#  setup-testlab.sh
#  Configura el proyecto TestLab AI desde cero.
#  Ejecutar desde la raíz del proyecto: bash setup-testlab.sh
# ================================================================

set -e  # Salir si cualquier comando falla

# ── Colores ──────────────────────────────────────────────────────
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

log_info()    { echo -e "${CYAN}➜  $1${RESET}"; }
log_success() { echo -e "${GREEN}✅ $1${RESET}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${RESET}"; }
log_error()   { echo -e "${RED}❌ $1${RESET}"; exit 1; }

echo ""
echo -e "${CYAN}========================================${RESET}"
echo -e "${CYAN}   🧪 TestLab AI — Setup automático     ${RESET}"
echo -e "${CYAN}========================================${RESET}"
echo ""

# ── 1. Verificar que estamos en la raíz correcta ─────────────────
if [ ! -f "package.json" ]; then
  log_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
fi
log_success "Directorio correcto detectado"

# ── 2. Estructura de carpetas ─────────────────────────────────────
log_info "Creando estructura de carpetas..."

mkdir -p \
  apps/api/src/domain/user \
  apps/api/src/domain/test-session \
  apps/api/src/infrastructure/db/prisma \
  apps/api/src/infrastructure/db/mongoose \
  apps/api/src/infrastructure/ai \
  apps/api/src/infrastructure/sandbox \
  apps/api/src/api/routes \
  apps/api/src/api/middlewares \
  apps/api/src/api/websockets \
  apps/web \
  packages/shared/src/schemas \
  packages/shared/src/types \
  sandbox/node-runner \
  sandbox/python-runner \
  scripts \
  .husky

log_success "Carpetas creadas"

# ── 3. Ficheros mal ubicados → mover al sitio correcto ───────────
log_info "Reubicando ficheros descargados..."

# pre-commit hook
if [ -f "pre-commit" ]; then
  mv pre-commit .husky/pre-commit
  log_success "pre-commit → .husky/pre-commit"
elif [ -f ".husky/pre-commit" ]; then
  log_warning "pre-commit ya estaba en .husky/"
else
  log_warning "No se encontró pre-commit — lo crearemos ahora"
fi

# prettierrc sin punto
if [ -f "prettierrc" ]; then
  mv prettierrc .prettierrc
  log_success "prettierrc → .prettierrc"
fi

# ── 4. Crear ficheros de configuración ───────────────────────────
log_info "Creando ficheros de configuración..."

# pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

# .npmrc
cat > .npmrc << 'EOF'
shamefully-hoist=false
strict-peer-dependencies=false
link-workspace-packages=true
EOF

# .gitignore
cat > .gitignore << 'EOF'
# Dependencias
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
.next/
out/

# Variables de entorno — NUNCA subir al repo
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
npm-debug.log*

# Docker
.docker/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Prisma
prisma/migrations/
EOF

# .prettierignore
cat > .prettierignore << 'EOF'
node_modules
dist
.next
build
*.lock
EOF

# .env.example
cat > .env.example << 'EOF'
# ── Base de datos ──────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/testlab"
MONGODB_URI="mongodb://localhost:27017/testlab"

# ── IA ─────────────────────────────────────────────────────────────────
GEMINI_API_KEY="tu-api-key-aqui"

# ── Auth ───────────────────────────────────────────────────────────────
JWT_SECRET="cambia-esto-por-un-secreto-seguro"

# ── App ────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
EOF

# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@testlab/shared": ["./packages/shared/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "dist", ".next"]
}
EOF

# README.md
cat > README.md << 'EOF'
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
EOF

log_success "Ficheros de configuración creados"

# ── 5. check-secrets.js ───────────────────────────────────────────
log_info "Creando scripts/check-secrets.js..."

cat > scripts/check-secrets.js << 'EOF'
#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const c = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m",
  yellow: "\x1b[33m", cyan: "\x1b[36m", white: "\x1b[37m",
  gray: "\x1b[90m",
};

const log = {
  info:    (msg) => console.log(`${c.cyan}${msg}${c.reset}`),
  success: (msg) => console.log(`${c.green}${msg}${c.reset}`),
  warning: (msg) => console.log(`${c.yellow}${msg}${c.reset}`),
  error:   (msg) => console.log(`${c.red}${msg}${c.reset}`),
  detail:  (msg) => console.log(`${c.gray}${msg}${c.reset}`),
};

const SUSPICIOUS_KEYWORDS = [
  "apikey","api_key","secret","token","password","passwd","firebase",
  "client_id","client_secret","bearer","private_key","auth_token",
  "access_token","refresh_token","database_url","jwt_secret",
  "encryption_key","stripe_key","aws_secret","aws_access_key","gemini_api_key",
];

const BINARY_EXTENSIONS = new Set([
  ".png",".jpg",".jpeg",".gif",".ico",".svg",".webp",".woff",".woff2",
  ".ttf",".pdf",".zip",".tar",".gz",".exe",".dll",".mp4",".mp3",
]);

const IGNORED_FILE_PATTERNS = [
  /\.example$/, /\.sample$/, /\.template$/, /\.env\.example$/,
  /package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/,
  /check-secrets\.js$/,
];

const VALUE_PATTERN = /[=:]["']?[a-zA-Z0-9+/\-_]{8,}["']?/;
const COMMENT_PATTERN = /^\s*(#|\/\/|\/\*|\*|<!--)/;

async function main() {
  console.log();
  log.info("🔍 Escaneando posibles secretos en los ficheros a commitear...");
  console.log();

  let stagedFiles;
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" }).trim();
    stagedFiles = output ? output.split("\n").map((f) => f.trim()) : [];
  } catch {
    log.error("❌ Error al obtener archivos del staging.");
    process.exit(1);
  }

  if (stagedFiles.length === 0) {
    log.detail("ℹ️  No hay ficheros en staging.");
    process.exit(0);
  }

  const keywordRegex = new RegExp(SUSPICIOUS_KEYWORDS.join("|"), "i");
  const findings = [];

  for (const file of stagedFiles) {
    const normalizedFile = file.replace(/\\/g, "/");
    if (!fs.existsSync(normalizedFile)) continue;
    const ext = path.extname(normalizedFile).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) continue;
    if (IGNORED_FILE_PATTERNS.some((p) => p.test(normalizedFile))) continue;

    let content;
    try {
      content = execSync(`git show :"${file}"`, { encoding: "utf8" });
    } catch { continue; }

    content.split("\n").forEach((line, index) => {
      if (COMMENT_PATTERN.test(line)) return;
      if (!keywordRegex.test(line)) return;
      if (!VALUE_PATTERN.test(line)) return;
      findings.push({ file: normalizedFile, line: index + 1, content: line.trim().substring(0, 120) });
    });
  }

  if (findings.length === 0) {
    log.success("✅ No se encontraron posibles secretos.");
    console.log();
    process.exit(0);
  }

  log.warning("⚠️  ¡ADVERTENCIA! Se detectaron posibles secretos:");
  console.log(c.yellow + "─".repeat(60) + c.reset);
  for (const f of findings) {
    console.log();
    log.info(`  📄 Archivo  : ${f.file}`);
    log.detail(`  📍 Línea    : ${f.line}`);
    log.error(`  🔑 Contenido: ${f.content}`);
  }
  console.log();
  log.info("💡 Usa variables de entorno (.env.local) en lugar de valores literales.");
  console.log();
  log.error("❌ COMMIT CANCELADO. Para saltar (solo si es falso positivo):");
  log.detail("   git commit --no-verify -m \"tu mensaje\"");
  console.log();
  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
EOF

log_success "check-secrets.js creado"

# ── 6. pre-commit hook ────────────────────────────────────────────
log_info "Configurando pre-commit hook..."

cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo ""
echo "🚀 Pre-commit checks iniciados..."
echo ""

echo "🔍 [1/3] Escaneando secretos..."
node scripts/check-secrets.js || { echo "❌ Secretos detectados. Commit cancelado."; exit 1; }

echo ""
echo "✨ [2/3] Formateando y validando (lint-staged)..."
pnpm lint-staged || { echo "❌ ESLint encontró errores. Corrígelos antes de commitear."; exit 1; }

echo ""
echo "✅ Todos los checks pasaron. Commit autorizado 🎉"
echo ""
EOF

chmod +x .husky/pre-commit
log_success "pre-commit hook configurado con permisos de ejecución"

# ── 7. .gitkeep en carpetas vacías ────────────────────────────────
log_info "Añadiendo .gitkeep a carpetas vacías..."
find apps packages sandbox -type d -empty -exec touch {}/.gitkeep \;
log_success ".gitkeep añadidos"

# ── 8. Resumen final ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}========================================${RESET}"
echo -e "${GREEN}   ✅ Setup completado correctamente    ${RESET}"
echo -e "${GREEN}========================================${RESET}"
echo ""
echo -e "Próximos pasos:"
echo -e "  ${CYAN}1.${RESET} cp .env.example .env.local  → añade tus variables reales"
echo -e "  ${CYAN}2.${RESET} pnpm install                → instala dependencias"
echo -e "  ${CYAN}3.${RESET} git add . && git commit -m \"feat: initial monorepo setup\""
echo ""
