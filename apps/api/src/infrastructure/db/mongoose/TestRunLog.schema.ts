import mongoose, { Schema, Document } from "mongoose";

export interface ITestRunLog extends Document {
  sessionId: string;
  startedAt: Date;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
  };
  suites: Array<{
    name: string;
    status: string;
    tests: Array<{
      name: string;
      status: string;
      duration: number;
      error?: string;
    }>;
  }>;
  rawOutput: string;
}

const TestRunLogSchema = new Schema<ITestRunLog>({
  sessionId: { type: String, required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  duration: { type: Number, required: true },
  summary: {
    total: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    coverage: { type: Number, default: 0 },
  },
  suites: [
    {
      name: String,
      status: String,
      tests: [
        {
          name: String,
          status: String,
          duration: Number,
          error: String,
        },
      ],
    },
  ],
  rawOutput: { type: String, required: true },
});

export const TestRunLog = mongoose.model<ITestRunLog>("TestRunLog", TestRunLogSchema);
