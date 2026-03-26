#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

const log = {
  info: (msg) => console.log(`${c.cyan}${msg}${c.reset}`),
  success: (msg) => console.log(`${c.green}${msg}${c.reset}`),
  warning: (msg) => console.log(`${c.yellow}${msg}${c.reset}`),
  error: (msg) => console.log(`${c.red}${msg}${c.reset}`),
  detail: (msg) => console.log(`${c.gray}${msg}${c.reset}`),
};

const SUSPICIOUS_KEYWORDS = [
  "apikey",
  "api_key",
  "secret",
  "token",
  "password",
  "passwd",
  "firebase",
  "client_id",
  "client_secret",
  "bearer",
  "private_key",
  "auth_token",
  "access_token",
  "refresh_token",
  "database_url",
  "jwt_secret",
  "encryption_key",
  "stripe_key",
  "aws_secret",
  "aws_access_key",
  "gemini_api_key",
];

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".exe",
  ".dll",
  ".mp4",
  ".mp3",
]);

const IGNORED_FILE_PATTERNS = [
  /\.example$/,
  /\.sample$/,
  /\.template$/,
  /\.env\.example$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /check-secrets\.js$/,
  /\.sh$/,
  /\.md$/,
  /\.txt$/,
  /\.log$/,
];

const VALUE_PATTERN = /[=:]["']?[a-zA-Z0-9+/\-_]{8,}["']?/;
const COMMENT_PATTERN = /^\s*(#|\/\/|\/\*|\*|<!--)/;

// Lines matching these patterns are safe and should never be flagged
const SAFE_LINE_PATTERNS = [
  /type=["']password["']/, // HTML input type attribute
  /placeholder=/, // HTML placeholder attributes
  /\.test\(|\.match\(|\.replace\(/, // regex / string operations in code
  /import.*from/, // import statements
  /\/\/ .*password/i, // inline comments mentioning password
  /passwordHash/, // field names like passwordHash
  /setPassword|getPassword|updatePassword|handlePassword|onChange.*password|onPassword/i,
  /\$\{[A-Z0-9_]+:-[^}]+\}/, // docker-compose/env interpolation defaults (${VAR:-default})
];

async function main() {
  console.log();
  log.info("🔍 Escaneando posibles secretos en los ficheros a commitear...");
  console.log();

  let stagedFiles;
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf8",
    }).trim();
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
    } catch {
      continue;
    }

    content.split("\n").forEach((line, index) => {
      if (COMMENT_PATTERN.test(line)) return;
      if (!keywordRegex.test(line)) return;
      if (!VALUE_PATTERN.test(line)) return;
      if (SAFE_LINE_PATTERNS.some((p) => p.test(line))) return; // ← skip false positives
      findings.push({
        file: normalizedFile,
        line: index + 1,
        content: line.trim().substring(0, 120),
      });
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
  log.detail('   git commit --no-verify -m "tu mensaje"');
  console.log();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
