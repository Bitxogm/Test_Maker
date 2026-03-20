import { ITestSessionRepository } from "../domain/test-session/TestSession.repository";
import { TestSessionStatus } from "../domain/test-session";
import {
  DockerSandbox,
  SandboxEnvironment,
  SandboxResult,
} from "../infrastructure/sandbox/DockerSandbox";
import { TestRunLog } from "../infrastructure/db/mongoose/TestRunLog.schema";
import { parseJestOutput, ParsedTestResult } from "./utils/parseJestOutput";

export interface RunTestsRequest {
  sessionId: string;
  environment: SandboxEnvironment;
  onOutput: (line: string) => void;
  onComplete?: (result: ParsedTestResult) => void;
}

export class RunTestsUseCase {
  constructor(
    private readonly testSessionRepository: ITestSessionRepository,
    private readonly sandbox: DockerSandbox
  ) {}

  async execute(request: RunTestsRequest): Promise<SandboxResult> {
    const { sessionId, environment, onOutput } = request;

    // 1. Recuperar sesión
    const session = await this.testSessionRepository.findById(sessionId);
    if (!session) {
      throw new Error("Sesión no encontrada");
    }

    // 2. Actualizar status a RUNNING
    await this.testSessionRepository.updateStatus(sessionId, TestSessionStatus.RUNNING);

    try {
      // 3. Ejecutar sandbox
      const result = await this.sandbox.runTests(
        {
          sessionId,
          code: session.originalCode,
          tests: session.generatedTests || "",
          environment,
        },
        onOutput
      );

      // 4. Determinar status final y parsear output
      const finalStatus =
        result.exitCode === 0 ? TestSessionStatus.PASSED : TestSessionStatus.FAILED;
      const parsedResult = parseJestOutput(result.rawOutput);

      // 5. Persistir log en MongoDB
      await TestRunLog.create({
        sessionId,
        startedAt: new Date(Date.now() - result.duration),
        duration: result.duration,
        rawOutput: result.rawOutput,
        summary: parsedResult.summary,
        suites: parsedResult.suites,
      });

      // 6. Actualizar status final en PostgreSQL
      await this.testSessionRepository.updateStatus(sessionId, finalStatus);

      if (request.onComplete) {
        request.onComplete(parsedResult);
      }

      return result;
    } catch (error) {
      // 7. En caso de error crítico del sandbox o timeout
      await this.testSessionRepository.updateStatus(sessionId, TestSessionStatus.ERROR);
      throw error;
    }
  }
}
