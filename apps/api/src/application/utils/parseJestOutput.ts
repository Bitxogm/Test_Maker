export interface ParsedTestResult {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
  };
  suites: Array<{
    name: string;
    status: string;
    tests: Array<{
      name: string;
      status: string;
      duration: number;
      error?: string;
    }>;
  }>;
}

export function parseJestOutput(rawOutput: string): ParsedTestResult {
  const result: ParsedTestResult = {
    summary: { total: 0, passed: 0, failed: 0, skipped: 0, coverage: 0 },
    suites: [],
  };

  const lines = rawOutput.split("\n");
  let currentSuite: ParsedTestResult["suites"][0] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Detectar Suite
    if (line.startsWith("PASS") || line.startsWith("FAIL")) {
      const parts = line.split(" ");
      currentSuite = {
        name: parts.slice(1).join(" ") || "Unknown Suite",
        status: parts[0],
        tests: [],
      };
      result.suites.push(currentSuite);
      continue;
    }

    // 2. Detectar Tests individuales (Vitest/Jest reporter básico)
    // ✓ nombre (10ms) o ✗ nombre o × nombre
    const testMatch = line.match(/^([✓✗×])\s+(.+?)(?:\s+\((\d+ms)\))?$/);
    if (testMatch && currentSuite) {
      const status = testMatch[1] === "✓" ? "passed" : "failed";
      const name = testMatch[2].trim();
      const duration = testMatch[3] ? parseInt(testMatch[3]) : 0;

      currentSuite.tests.push({
        name,
        status,
        duration,
      });
      continue;
    }

    // 3. Resumen final (Tests: 2 passed, 2 total)
    if (line.startsWith("Tests:")) {
      const passedMatch = line.match(/(\d+)\s+passed/);
      const failedMatch = line.match(/(\d+)\s+failed/);
      const totalMatch = line.match(/(\d+)\s+total/);
      const skippedMatch = line.match(/(\d+)\s+skipped/);

      if (passedMatch) result.summary.passed = parseInt(passedMatch[1]);
      if (failedMatch) result.summary.failed = parseInt(failedMatch[1]);
      if (totalMatch) result.summary.total = parseInt(totalMatch[1]);
      if (skippedMatch) result.summary.skipped = parseInt(skippedMatch[1]);
      continue;
    }

    // 4. Cobertura (si existe una tabla o línea de % Coverage)
    const coverageMatch = line.match(/All\s+files\s+\|\s+([\d.]+)/i);
    if (coverageMatch) {
      result.summary.coverage = parseFloat(coverageMatch[1]);
      continue;
    }

    // 5. Errores detallados (después de un ● en Jest)
    if (line.startsWith("●") && currentSuite) {
      const testName = line.slice(1).trim();
      const test = currentSuite.tests.find((t) => t.name === testName);
      if (test) {
        const errorLines = [];
        let j = i + 1;
        while (j < lines.length && lines[j].trim() !== "" && !lines[j].startsWith("●")) {
          errorLines.push(lines[j].trim());
          j++;
        }
        test.error = errorLines.join("\n");
      }
    }
  }

  // Fallback si no detectó el total pero sí individuales
  if (result.summary.total === 0) {
    result.suites.forEach((s) => {
      result.summary.total += s.tests.length;
      result.summary.passed += s.tests.filter((t) => t.status === "passed").length;
      result.summary.failed += s.tests.filter((t) => t.status === "failed").length;
    });
  }

  return result;
}
