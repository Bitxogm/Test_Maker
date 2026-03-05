import { AIAdapter } from "../infrastructure/ai/AIAdapter.interface";
import { ITestSessionRepository } from "../domain/test-session/TestSession.repository";
import { TestSession, TestSessionStatus } from "../domain/test-session";
import { randomUUID } from "crypto";

export interface GenerateTestsRequest {
  code: string;
  inputLanguage: string;
  outputLanguage: string;
  analysisMode: string;
  userId: string;
}

export interface GenerateTestsResponse {
  sessionId: string;
  unitTests: string;
  testSummary: string;
  framework: string;
  coverageHints: string[];
}

export class GenerateTestsUseCase {
  constructor(
    private readonly aiAdapter: AIAdapter,
    private readonly testSessionRepository: ITestSessionRepository
  ) {}

  async execute(request: GenerateTestsRequest): Promise<GenerateTestsResponse> {
    const { code, inputLanguage, outputLanguage, analysisMode, userId } = request;

    // 1. Obtener tests de la IA
    const aiResult = await this.aiAdapter.generateTests(
      code,
      inputLanguage,
      outputLanguage,
      analysisMode
    );

    // 2. Crear entidad de dominio para la sesión
    const sessionId = randomUUID();
    const session = new TestSession({
      id: sessionId,
      projectId: "default-project", // Opcional en Prisma, requerido en dominio (podría venir en el request en el futuro)
      userId,
      originalCode: code,
      generatedTests: aiResult.unitTests,
      status: TestSessionStatus.PENDING,
      inputLanguage,
      outputLanguage,
      analysisMode,
      createdAt: new Date(),
    });

    // 3. Persistir sesión inicial
    await this.testSessionRepository.save(session);

    return {
      sessionId,
      unitTests: aiResult.unitTests,
      testSummary: aiResult.testSummary,
      framework: aiResult.framework,
      coverageHints: aiResult.coverageHints,
    };
  }
}
