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
- Los tests deben usar ES Modules (import/export), NUNCA CommonJS (require/module.exports).
- El código fuente y los tests se ejecutan en el mismo fichero de contexto: NO uses import del fichero solution ni incluyas el código original, escribe solo los tests.
- NO incluyas import ni require al principio de los tests (vitest globals están disponibles).
- Asegúrate de que el código dentro de "unitTests" tenga los caracteres especiales escapados.
`;

    const prompt = `${instruction}\n\nCódigo a procesar:\n\`\`\`${inputLanguage}\n${code}\n\`\`\``;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Limpiar la respuesta
      let cleanedText = text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      // Extraer solo el objeto JSON si hay texto extra
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No se encontró JSON en la respuesta");
      }
      cleanedText = jsonMatch[0];

      // Parsear usando un enfoque más tolerante
      let parsed: AnalysisResult;
      try {
        cleanedText = this.sanitizeJsonString(cleanedText);
        parsed = JSON.parse(cleanedText);
      } catch (e) {
        // Segundo intento: extraer campos manualmente con regex
        const unitTestsMatch = cleanedText.match(/"unitTests"\s*:\s*"([\s\S]*?)(?<!\\)"/);
        if (unitTestsMatch) {
          parsed = {
            unitTests: unitTestsMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\")
              .replace(/\\"/g, '"'),
            testSummary: "",
            framework: "Jest",
            coverageHints: [],
          };
        } else {
          console.error("❌ Error parseando JSON de Gemini:", text);
          throw new Error("Respuesta de Gemini no es JSON válido", { cause: e });
        }
      }

      if (!parsed.unitTests || !parsed.framework) {
        throw new Error("JSON incompleto");
      }

      // Asegurar que los saltos de línea estén bien procesados
      parsed.unitTests = parsed.unitTests.replace(/\\n/g, "\n");

      return parsed;
    } catch (error) {
      console.error("❌ Error en GeminiAdapter:", error);
      throw new Error(
        `Fallo en análisis con Gemini: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
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
}
