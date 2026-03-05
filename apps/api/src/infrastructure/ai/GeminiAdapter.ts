import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
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
- Asegúrate de que el código dentro de "unitTests" tenga los caracteres especiales escapados.
`;

    const prompt = `${instruction}\n\nCódigo a procesar:\n\`\`\`${inputLanguage}\n${code}\n\`\`\``;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Limpiar posibles bloques markdown si Gemini los incluye por error
      const cleanedText = text
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();

      try {
        const parsed = JSON.parse(cleanedText) as AnalysisResult;

        if (!parsed.unitTests || !parsed.framework) {
          throw new Error("JSON incompleto");
        }

        return parsed;
      } catch (error) {
        console.error("❌ Error parseando JSON de Gemini:", text);
        throw new Error("Respuesta de Gemini no es JSON válido o falta información", {
          cause: error,
        });
      }
    } catch (error) {
      console.error("❌ Error en GeminiAdapter:", error);
      throw new Error(
        `Fallo en análisis con Gemini: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }
}
