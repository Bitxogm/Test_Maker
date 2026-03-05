export enum TestSessionStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  PASSED = "PASSED",
  FAILED = "FAILED",
  ERROR = "ERROR",
}

export interface TestSessionProps {
  id: string;
  projectId: string;
  userId: string;
  originalCode: string;
  generatedTests?: string;
  status: TestSessionStatus;
  inputLanguage: string;
  outputLanguage: string;
  analysisMode: string;
  mongoLogId?: string;
  createdAt: Date;
}

export class TestSession {
  public readonly id: string;
  public readonly projectId: string;
  public readonly userId: string;
  public readonly originalCode: string;
  public readonly generatedTests?: string;
  public readonly status: TestSessionStatus;
  public readonly inputLanguage: string;
  public readonly outputLanguage: string;
  public readonly analysisMode: string;
  public readonly mongoLogId?: string;
  public readonly createdAt: Date;

  constructor(props: TestSessionProps) {
    this.id = props.id;
    this.projectId = props.projectId;
    this.userId = props.userId;
    this.originalCode = props.originalCode;
    this.generatedTests = props.generatedTests;
    this.status = props.status;
    this.inputLanguage = props.inputLanguage;
    this.outputLanguage = props.outputLanguage;
    this.analysisMode = props.analysisMode;
    this.mongoLogId = props.mongoLogId;
    this.createdAt = props.createdAt;
  }
}
