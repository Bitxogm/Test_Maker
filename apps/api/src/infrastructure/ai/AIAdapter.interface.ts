export interface AnalysisResult {
  unitTests: string;
  testSummary: string;
  framework: string;
  coverageHints: string[];
}

export interface AIAdapter {
  generateTests(
    code: string,
    inputLanguage: string,
    outputLanguage: string,
    analysisMode: string
  ): Promise<AnalysisResult>;

  chat(
    context: string,
    history: { role: string; content: string }[],
    message: string
  ): Promise<string>;
}
