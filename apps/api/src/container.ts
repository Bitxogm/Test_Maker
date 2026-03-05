import { PrismaClientSingleton } from "./infrastructure/db/prisma/PrismaClient";
import { PrismaUserRepository } from "./infrastructure/db/prisma/PrismaUserRepository";
import { PrismaTestSessionRepository } from "./infrastructure/db/prisma/PrismaTestSessionRepository";
import { GeminiAdapter } from "./infrastructure/ai/GeminiAdapter";
import { DockerSandbox } from "./infrastructure/sandbox/DockerSandbox";
import { GenerateTestsUseCase } from "./application/GenerateTestsUseCase";
import { RunTestsUseCase } from "./application/RunTestsUseCase";

// 1. Database Clients
const prisma = PrismaClientSingleton.getInstance();

// 2. Repositories
const userRepository = new PrismaUserRepository(prisma);
const testSessionRepository = new PrismaTestSessionRepository(prisma);

// 3. Infrastructure Adapters
const aiAdapter = new GeminiAdapter();
const sandbox = new DockerSandbox();

// 4. Use Cases
const generateTestsUseCase = new GenerateTestsUseCase(aiAdapter, testSessionRepository);
const runTestsUseCase = new RunTestsUseCase(testSessionRepository, sandbox);

export const container = {
  userRepository,
  testSessionRepository,
  aiAdapter,
  sandbox,
  generateTestsUseCase,
  runTestsUseCase,
};
