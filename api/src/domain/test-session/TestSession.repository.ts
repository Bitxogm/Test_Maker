import { TestSession, TestSessionStatus } from "./TestSession.entity";

export interface ITestSessionRepository {
  findById(id: string): Promise<TestSession | null>;
  findByUserId(userId: string): Promise<TestSession[]>;
  save(session: TestSession): Promise<void>;
  updateStatus(id: string, status: TestSessionStatus): Promise<void>;
  delete(id: string): Promise<void>;
}
