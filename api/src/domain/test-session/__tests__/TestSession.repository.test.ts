import { describe, it, expect, vi } from "vitest";
import { ITestSessionRepository } from "../TestSession.repository";
import { TestSession, TestSessionStatus } from "../TestSession.entity";

describe("ITestSessionRepository Interface (Mock)", () => {
  it("should be implementable by a mock", async () => {
    const mockSession = new TestSession({
      id: "s1",
      projectId: "p1",
      userId: "u1",
      originalCode: "test",
      status: TestSessionStatus.PENDING,
      inputLanguage: "ts",
      outputLanguage: "ts",
      analysisMode: "fast",
      createdAt: new Date(),
    });

    const mockRepo: ITestSessionRepository = {
      findById: vi.fn().mockResolvedValue(mockSession),
      findByUserId: vi.fn().mockResolvedValue([mockSession]),
      save: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const session = await mockRepo.findById("s1");
    expect(session).toBe(mockSession);

    await mockRepo.updateStatus("s1", TestSessionStatus.RUNNING);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith("s1", TestSessionStatus.RUNNING);
  });
});
