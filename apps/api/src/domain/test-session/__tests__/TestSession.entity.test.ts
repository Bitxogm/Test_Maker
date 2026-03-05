import { describe, it, expect } from "vitest";
import { TestSession, TestSessionStatus } from "../TestSession.entity";

describe("TestSession Entity", () => {
  it("should create a test session with all required properties", () => {
    const props = {
      id: "session-1",
      projectId: "project-1",
      userId: "user-1",
      originalCode: "console.log('hello')",
      status: TestSessionStatus.PENDING,
      inputLanguage: "javascript",
      outputLanguage: "javascript",
      analysisMode: "fast",
      createdAt: new Date(),
    };

    const session = new TestSession(props);

    expect(session.id).toBe(props.id);
    expect(session.originalCode).toBe(props.originalCode);
    expect(session.status).toBe(TestSessionStatus.PENDING);
    expect(session.generatedTests).toBeUndefined();
  });

  it("should create a test session with optional properties", () => {
    const props = {
      id: "session-2",
      projectId: "project-1",
      userId: "user-1",
      originalCode: "function add(a, b) { return a + b; }",
      generatedTests: "describe('add', () => { ... })",
      status: TestSessionStatus.PASSED,
      inputLanguage: "javascript",
      outputLanguage: "javascript",
      analysisMode: "deep",
      mongoLogId: "mongo-123",
      createdAt: new Date(),
    };

    const session = new TestSession(props);

    expect(session.generatedTests).toBe(props.generatedTests);
    expect(session.mongoLogId).toBe(props.mongoLogId);
    expect(session.status).toBe(TestSessionStatus.PASSED);
  });

  it("should handle error status", () => {
    const props = {
      id: "session-3",
      projectId: "project-1",
      userId: "user-1",
      originalCode: "broken code",
      status: TestSessionStatus.ERROR,
      inputLanguage: "javascript",
      outputLanguage: "javascript",
      analysisMode: "fast",
      createdAt: new Date(),
    };

    const session = new TestSession(props);
    expect(session.status).toBe(TestSessionStatus.ERROR);
  });
});
