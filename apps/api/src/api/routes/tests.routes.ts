import { Router } from "express";
import { Server } from "socket.io";
import { z } from "zod";
import { container } from "../../container";

// ── Schemas de validación ─────────────────────────────────────────

const generateTestsSchema = z.object({
  code: z.string().min(1, "El código es obligatorio"),
  inputLanguage: z.string(),
  outputLanguage: z.string(),
  analysisMode: z.string(),
  userId: z.string(),
});

const runTestsSchema = z.object({
  sessionId: z.string().uuid("ID de sesión inválido"),
  environment: z.enum(["node", "react", "nextjs", "python"]),
});

// ── Router Factory ────────────────────────────────────────────────

export function createTestsRouter(io: Server): Router {
  const router: Router = Router();

  // POST /api/tests/generate
  router.post("/generate", async (req, res) => {
    try {
      const validatedData = generateTestsSchema.parse(req.body);
      const result = await container.generateTestsUseCase.execute(validatedData);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error generating tests:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Error interno" });
    }
  });

  // POST /api/tests/run
  router.post("/run", async (req, res) => {
    try {
      const { sessionId, environment } = runTestsSchema.parse(req.body);

      const result = await container.runTestsUseCase.execute({
        sessionId,
        environment,
        onOutput: (line) => {
          io.to(sessionId).emit("test:output", { line });
        },
        onComplete: (parsedResult) => {
          io.to(sessionId).emit("test:complete", parsedResult);
        },
      });

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }

      const message = error instanceof Error ? error.message : "Error interno";

      if (message.includes("Sesión no encontrada")) {
        return res.status(404).json({ error: message });
      }

      if (message.includes("Timeout")) {
        return res.status(408).json({ error: message });
      }

      console.error("Error running tests:", error);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
