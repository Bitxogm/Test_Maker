import { Router } from "express";
import { z } from "zod";
import { container } from "../../container";

const chatSchema = z.object({
  code: z.string(),
  generatedTests: z.string().optional(),
  terminalOutput: z.array(z.string()).optional(),
  history: z.array(z.object({ role: z.enum(["user", "model", "assistant"]), content: z.string() })),
  message: z.string().min(1),
});

export function createChatRouter(): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const data = chatSchema.parse(req.body);
      const response = await container.chatUseCase.execute({
        code: data.code,
        generatedTests: data.generatedTests || "Sin tests generados aún.",
        terminalOutput: (data.terminalOutput || []).join("\n") || "Sin ejecución aún.",
        history: data.history,
        message: data.message,
      });
      res.json({ response });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error en chat:", error);
      res.status(500).json({ error: "Error interno en chat." });
    }
  });

  return router;
}
