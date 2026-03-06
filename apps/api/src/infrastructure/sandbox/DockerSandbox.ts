import Docker from "dockerode";
import { Readable } from "stream";

export interface SandboxResult {
  exitCode: number;
  duration: number;
  rawOutput: string;
}

export type SandboxEnvironment = "node" | "react" | "nextjs" | "python";

export interface SandboxParams {
  sessionId: string;
  code: string;
  tests: string;
  environment: SandboxEnvironment;
}

export class DockerSandbox {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async runTests(params: SandboxParams, onOutput: (line: string) => void): Promise<SandboxResult> {
    const { sessionId, code, tests, environment } = params;
    const startTime = Date.now();
    const imageName = `testlab-${environment}`;

    // Comando para escribir archivos y ejecutar según entorno
    const cmd = this.getExecutionCommand(environment, code, tests);

    let container: Docker.Container | undefined;

    try {
      container = await this.docker.createContainer({
        Image: imageName,
        Cmd: ["sh", "-c", cmd],
        HostConfig: {
          Memory: 256 * 1024 * 1024, // 256MB
          NanoCpus: 500000000, // 0.5 CPU
        },
        NetworkDisabled: true,
        Labels: { "testlab.session.id": sessionId },
      });

      await container.start();

      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      });

      const rawOutput = await this.streamLogs(stream, onOutput);

      const inspectData = await container.wait();
      const duration = Date.now() - startTime;

      try {
        await container.remove();
      } catch {
        // Ignorar si ya fue removido
      }

      return {
        exitCode: inspectData.StatusCode,
        duration,
        rawOutput,
      };
    } catch (error) {
      if (container) {
        try {
          await container.kill();
        } catch {
          // Ignorar si ya está detenido
        }
        try {
          await container.remove();
        } catch {
          // Ignorar si ya fue removido
        }
      }
      throw error;
    }
  }

  private getExecutionCommand(
    environment: SandboxEnvironment,
    code: string,
    tests: string
  ): string {
    const encodedCode = Buffer.from(code).toString("base64");
    const encodedTests = Buffer.from(tests).toString("base64");

    switch (environment) {
      case "node":
      case "react":
      case "nextjs":
        return `
          echo '${encodedCode}' | base64 -d > solution.ts
          echo '${encodedTests}' | base64 -d > solution.test.ts
          /deps/node_modules/.bin/vitest run --globals --reporter=verbose solution.test.ts
        `;
      case "python":
        return `
          echo '${encodedCode}' | base64 -d > solution.py
          echo '${encodedTests}' | base64 -d > test_solution.py
          pytest test_solution.py --cov=solution
        `;
      default:
        throw new Error(`Entorno no soportado: ${environment}`);
    }
  }

  private async streamLogs(
    stream: Readable | NodeJS.ReadableStream,
    onOutput: (line: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullOutput = "";

      const timeout = setTimeout(() => {
        if ("destroy" in stream && typeof (stream as { destroy: unknown }).destroy === "function") {
          (stream as unknown as { destroy: () => void }).destroy();
        }
        reject(new Error("Timeout: ejecución superó 60 segundos"));
      }, 60000);

      stream.on("data", (chunk: Buffer) => {
        let offset = 0;
        while (offset < chunk.length) {
          // Docker Stream Header: 8 bytes [type, 0, 0, 0, size1, size2, size3, size4]
          if (chunk[offset] === 1 || chunk[offset] === 2) {
            if (offset + 8 > chunk.length) break;
            const size = chunk.readUInt32BE(offset + 4);
            const message = chunk.toString(
              "utf8",
              offset + 8,
              Math.min(offset + 8 + size, chunk.length)
            );
            this.processMessage(message, onOutput);
            fullOutput += message;
            offset += 8 + size;
          } else {
            const message = chunk.toString("utf8", offset);
            this.processMessage(message, onOutput);
            fullOutput += message;
            break;
          }
        }
      });

      stream.on("end", () => {
        clearTimeout(timeout);
        resolve(fullOutput);
      });

      stream.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private processMessage(message: string, onOutput: (line: string) => void) {
    const lines = message.split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        onOutput(line);
      }
    });
  }
}
