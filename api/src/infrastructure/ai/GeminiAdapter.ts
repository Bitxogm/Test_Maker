import { GoogleGenerativeAI, GenerativeModel, Content } from "@google/generative-ai";
import { AIAdapter, AnalysisResult } from "./AIAdapter.interface";

export class GeminiAdapter implements AIAdapter {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor() {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      console.error("❌ GEMINI_API_KEY no configurada.");
      throw new Error("API Key para Gemini no configurada.");
    }
    this.genAI = new GoogleGenerativeAI(API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async generateTests(
    code: string,
    inputLanguage: string,
    outputLanguage: string,
    analysisMode: string
  ): Promise<AnalysisResult> {
    const instruction = `
Eres un ingeniero de software experto en testing y calidad de código.
Analiza el siguiente código en \`${inputLanguage}\` y genera pruebas unitarias exhaustivas en \`${outputLanguage}\`.

Requisitos del modo \`${analysisMode}\`:
- Si es 'test', enfócate en cobertura total y casos de error.
- Si es 'security', enfócate en inyecciones y validaciones.

Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido con este formato:
{
  "unitTests": "código de tests completo",
  "testSummary": "resumen de lo que cubren los tests",
  "framework": "nombre del framework usado (ej: Vitest, Jest, pytest)",
  "coverageHints": ["pista 1", "pista 2"]
}

REGLAS CRÍTICAS:
- NO incluyas bloques de código markdown (\`\`\`json).
- NO incluyas texto antes o después del JSON.
- Para JS/TS: Los tests deben usar ES Modules (NUNCA CommonJS).
- IMPORTANTE (JS/TS): El código de la solución y los tests se ejecutan en el mismo ámbito (archivo unificado). NUNCA vuelvas a declarar clases, funciones o variables que ya existan en la solución. Asume que todo lo definido en la solución ya está disponible globalmente. NO uses import del fichero \`solution\`.
- Para Python: los tests DEBEN incluir al principio un import explícito de la función original, por ejemplo: \`from solution import nombre_funcion\`.
- El código dentro de "unitTests" debe ser una cadena JSON válida con caracteres de escape correctos (especialmente comillas y saltos de línea).
`;

    const prompt = `${instruction}\n\nCódigo a procesar:\n\`\`\`${inputLanguage}\n${code}\n\`\`\``;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      });
      const response = await result.response;
      const text = response.text().trim();

      const parsed = this.parseAnalysisResult(text, outputLanguage, analysisMode);
      return parsed;
    } catch (error) {
      console.error("❌ Error en GeminiAdapter:", error);
      throw new Error(
        `Fallo en análisis con Gemini: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }

  async chat(
    context: string,
    history: { role: string; content: string }[],
    message: string
  ): Promise<string> {
    const promptContext = `Contexto del Sandbox:\n${context}\n\nActúa como un asistente experto e ingeniero de QA. Ayuda al usuario con su código y resultados de test. Responde de forma concisa.`;

    const formattedHistory: Content[] = [
      { role: "user", parts: [{ text: promptContext }] } as Content,
      {
        role: "model",
        parts: [{ text: "¡Entendido! Estoy listo para ayudarte con tu código y los resultados." }],
      } as Content,
      ...history.map(
        (m): Content => ({
          role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
          parts: [{ text: m.content }],
        })
      ),
    ];

    try {
      const chatSession = this.model.startChat({
        history: formattedHistory,
        generationConfig: { temperature: 0.2 },
      });
      const result = await chatSession.sendMessage(message);
      return result.response.text();
    } catch (error) {
      console.error("❌ Error en GeminiAdapter chat:", error);
      throw new Error("Fallo en el chat con Gemini", { cause: error });
    }
  }

  private sanitizeJsonString(text: string): string {
    // Reemplazar \' por ' (inválido en JSON)
    // Pero solo fuera de los valores de string ya escapados
    const controlChars = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "g");
    return text
      .replace(/\\'/g, "'") // \' → '
      .replace(/\t/g, "\\t") // tabs sin escapar
      .replace(/\r/g, "") // carriage returns
      .replace(controlChars, ""); // control chars inválidos
  }

  private parseAnalysisResult(
    rawText: string,
    outputLanguage: string,
    analysisMode: string
  ): AnalysisResult {
    const parsedFromJson = this.tryParseFromJsonCandidates(rawText, outputLanguage, analysisMode);
    if (parsedFromJson) {
      return parsedFromJson;
    }

    console.warn(
      "⚠️ Gemini no devolvió un JSON válido/utilizable. Aplicando fallback de texto plano."
    );
    return this.buildFallbackResult(rawText, outputLanguage, analysisMode);
  }

  private tryParseFromJsonCandidates(
    rawText: string,
    outputLanguage: string,
    analysisMode: string
  ): AnalysisResult | null {
    const candidates = this.collectJsonCandidates(rawText);

    for (const candidate of candidates) {
      const parsed = this.parseJsonCandidate(candidate);
      if (!parsed) continue;

      try {
        return this.normalizeAnalysisResult(parsed, outputLanguage, analysisMode);
      } catch {
        continue;
      }
    }

    return null;
  }

  private collectJsonCandidates(rawText: string): string[] {
    const normalized = rawText.trim();
    const candidates: string[] = [];

    candidates.push(normalized);

    const fencedJsonMatches = normalized.match(/```json\s*([\s\S]*?)```/gi) ?? [];
    for (const block of fencedJsonMatches) {
      candidates.push(
        block
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim()
      );
    }

    const fencedAnyMatches = normalized.match(/```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/g) ?? [];
    for (const block of fencedAnyMatches) {
      candidates.push(
        block
          .replace(/^```[a-zA-Z0-9_-]*\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim()
      );
    }

    candidates.push(...this.extractBalancedJsonObjects(normalized));

    return Array.from(new Set(candidates.filter(Boolean)));
  }

  private extractBalancedJsonObjects(text: string): string[] {
    const objects: string[] = [];

    for (let start = 0; start < text.length; start++) {
      if (text[start] !== "{") continue;

      let depth = 0;
      let inString = false;
      let escaping = false;

      for (let end = start; end < text.length; end++) {
        const char = text[end];

        if (inString) {
          if (escaping) {
            escaping = false;
          } else if (char === "\\") {
            escaping = true;
          } else if (char === '"') {
            inString = false;
          }
          continue;
        }

        if (char === '"') {
          inString = true;
          continue;
        }

        if (char === "{") depth++;
        if (char === "}") depth--;

        if (depth === 0) {
          objects.push(text.slice(start, end + 1).trim());
          break;
        }
      }
    }

    return objects;
  }

  private parseJsonCandidate(candidate: string): unknown | null {
    const sanitized = this.sanitizeJsonString(candidate);

    try {
      return JSON.parse(sanitized);
    } catch {
      try {
        const aggressive = sanitized
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .replace(/\\'/g, "'")
          .trim();
        return JSON.parse(aggressive);
      } catch {
        return null;
      }
    }
  }

  private normalizeAnalysisResult(
    parsed: unknown,
    outputLanguage: string,
    analysisMode: string
  ): AnalysisResult {
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Respuesta JSON inválida: no es objeto");
    }

    const obj = parsed as Record<string, unknown>;
    const unitTestsRaw = obj.unitTests;
    const testSummaryRaw = obj.testSummary;
    const frameworkRaw = obj.framework;
    const coverageHintsRaw = obj.coverageHints;

    if (typeof unitTestsRaw !== "string") {
      throw new Error("Respuesta JSON inválida: unitTests debe ser string");
    }

    const unitTests = this.normalizeUnitTests(unitTestsRaw);

    const testSummary =
      typeof testSummaryRaw === "string" && testSummaryRaw.trim().length > 0
        ? testSummaryRaw
        : `Suite generada en modo ${analysisMode}.`;
    const framework =
      typeof frameworkRaw === "string" && frameworkRaw.trim().length > 0
        ? frameworkRaw
        : this.inferFramework(outputLanguage);
    const coverageHints = Array.isArray(coverageHintsRaw)
      ? coverageHintsRaw
          .map((hint) => (typeof hint === "string" ? hint.trim() : ""))
          .filter((hint) => hint.length > 0)
      : [];

    return {
      unitTests,
      testSummary,
      framework,
      coverageHints,
    };
  }

  private normalizeUnitTests(unitTestsRaw: string): string {
    let unitTests = unitTestsRaw.replace(/\\n/g, "\n").trim();

    if (!unitTests) {
      throw new Error("Respuesta JSON inválida: unitTests vacío");
    }

    if (
      (unitTests.startsWith('"') && unitTests.endsWith('"')) ||
      (unitTests.startsWith("'") && unitTests.endsWith("'"))
    ) {
      try {
        const unwrapped = JSON.parse(unitTests);
        if (typeof unwrapped === "string" && unwrapped.trim().length > 0) {
          unitTests = unwrapped.trim();
        }
      } catch {
        // Si no se puede deserializar, se conserva el texto original.
      }
    }

    if (unitTests === '""' || unitTests === "''") {
      throw new Error("Respuesta JSON inválida: unitTests vacío literal");
    }

    return unitTests;
  }

  private buildFallbackResult(
    rawText: string,
    outputLanguage: string,
    analysisMode: string
  ): AnalysisResult {
    const extractedCode = this.extractCodeBlock(rawText);
    const unitTests = extractedCode || rawText.trim();

    if (!unitTests) {
      throw new Error("Gemini devolvió una respuesta vacía");
    }

    return {
      unitTests,
      testSummary: `Suite generada en modo ${analysisMode} (fallback sin JSON estructurado).`,
      framework: this.inferFramework(outputLanguage, unitTests),
      coverageHints: [],
    };
  }

  private extractCodeBlock(text: string): string {
    const blockMatches = Array.from(text.matchAll(/```(?:[a-zA-Z0-9_+-]+)?\s*([\s\S]*?)```/g));
    if (!blockMatches.length) return "";

    return blockMatches
      .map((match) => match[1]?.trim() ?? "")
      .sort((a, b) => b.length - a.length)[0];
  }

  private inferFramework(outputLanguage: string, unitTests = ""): string {
    const lang = outputLanguage.toLowerCase();
    const snippet = unitTests.toLowerCase();

    if (snippet.includes("vitest") || snippet.includes("vi.")) return "Vitest";
    if (snippet.includes("@jest") || snippet.includes("jest")) return "Jest";
    if (lang.includes("python") || snippet.includes("pytest")) return "pytest";
    if (
      lang.includes("typescript") ||
      lang.includes("javascript") ||
      lang.includes("js") ||
      lang.includes("ts")
    ) {
      return "Vitest";
    }

    return "Unknown";
  }
}
