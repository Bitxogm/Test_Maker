import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_URL,
});

export interface GenerateTestsResponse {
  unitTests: string;
  sessionId: string;
}

export const generateTests = async (
  code: string,
  inputLanguage: string,
  outputLanguage: string,
  analysisMode: string,
  userId?: string | null
): Promise<GenerateTestsResponse> => {
  const response = await api.post("/api/tests/generate", {
    code,
    inputLanguage,
    outputLanguage,
    analysisMode,
    ...(userId ? { userId } : {}),
  });
  return response.data;
};

export const runTests = async (sessionId: string, environment: string): Promise<void> => {
  await api.post("/api/tests/run", {
    sessionId,
    environment,
  });
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const sendChatMessage = async (
  code: string,
  generatedTests: string,
  terminalOutput: string[],
  history: ChatMessage[],
  message: string
): Promise<string> => {
  const response = await api.post("/api/chat", {
    code,
    generatedTests,
    terminalOutput,
    history,
    message,
  });
  return response.data.response;
};
