import { AIAdapter } from "../infrastructure/ai/AIAdapter.interface";

export interface ChatRequest {
  code: string;
  generatedTests: string;
  terminalOutput: string;
  history: { role: string; content: string }[];
  message: string;
}

export class ChatUseCase {
  constructor(private readonly aiAdapter: AIAdapter) {}

  async execute(req: ChatRequest): Promise<string> {
    const context = `
=== CÓDIGO DEL USUARIO ===
${req.code}

=== TESTS GENERADOS ===
${req.generatedTests}

=== OUTPUT DEL TERMINAL ===
${req.terminalOutput}
    `;

    return await this.aiAdapter.chat(context, req.history, req.message);
  }
}
