import {
  PrismaClient,
  TestSession as PrismaSession,
  TestStatus as PrismaStatus,
} from "@prisma/client";
import {
  TestSession,
  TestSessionStatus,
  ITestSessionRepository,
} from "../../../domain/test-session";

export class PrismaTestSessionRepository implements ITestSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(prismaSession: PrismaSession): TestSession {
    return new TestSession({
      id: prismaSession.id,
      projectId: prismaSession.projectId || "default-project",
      userId: prismaSession.userId,
      originalCode: prismaSession.originalCode,
      generatedTests: prismaSession.generatedTests || undefined,
      status: prismaSession.status as unknown as TestSessionStatus,
      inputLanguage: prismaSession.inputLanguage,
      outputLanguage: prismaSession.outputLanguage,
      analysisMode: prismaSession.analysisMode,
      mongoLogId: prismaSession.mongoLogId || undefined,
      createdAt: prismaSession.createdAt,
    });
  }

  async findById(id: string): Promise<TestSession | null> {
    const prismaSession = await this.prisma.testSession.findUnique({
      where: { id },
    });
    return prismaSession ? this.toDomain(prismaSession) : null;
  }

  async findByUserId(userId: string): Promise<TestSession[]> {
    const prismaSessions = await this.prisma.testSession.findMany({
      where: { userId },
    });
    return prismaSessions.map((s) => this.toDomain(s));
  }

  async save(session: TestSession): Promise<void> {
    await this.prisma.testSession.upsert({
      where: { id: session.id },
      update: {
        projectId: session.projectId,
        status: session.status as unknown as PrismaStatus,
        generatedTests: session.generatedTests,
        mongoLogId: session.mongoLogId,
      },
      create: {
        id: session.id,
        projectId: session.projectId,
        userId: session.userId ?? null,
        originalCode: session.originalCode,
        generatedTests: session.generatedTests,
        status: session.status as unknown as PrismaStatus,
        inputLanguage: session.inputLanguage,
        outputLanguage: session.outputLanguage,
        analysisMode: session.analysisMode,
        mongoLogId: session.mongoLogId,
        createdAt: session.createdAt,
      },
    });
  }

  async updateStatus(id: string, status: TestSessionStatus): Promise<void> {
    await this.prisma.testSession.update({
      where: { id },
      data: {
        status: status as unknown as PrismaStatus,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.testSession.delete({
      where: { id },
    });
  }
}
