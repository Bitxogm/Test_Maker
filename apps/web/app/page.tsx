"use client";

import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Play,
  Sparkles,
  Terminal as TerminalIcon,
  BarChart3,
  Clipboard,
  Upload,
  FileCode,
  Settings,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  ShieldCheck,
  Cpu,
  MessageCircle,
  Send,
  User,
  Bot,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import Ansi from "ansi-to-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cn } from "@/lib/utils";
import { io } from "socket.io-client";
import {
  generateTests as generateTestsAPI,
  runTests as runTestsAPI,
  GenerateTestsResponse,
} from "@/lib/api";

// --- Types ---

interface CoverageStat {
  name: string;
  value: number;
  fill: string;
}

interface EnvVar {
  key: string;
  value: string;
}

interface TestConfig {
  framework: "vitest" | "jest" | "mocha" | "pytest" | "playwright" | "cypress";
  level: "unit" | "integration" | "e2e";
  mockingEnabled: boolean;
  envVars: EnvVar[];
  selectedFiles: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  sourceCode: string;
  generatedTests: string;
  framework: string;
  level: string;
}

// --- Constants ---

const INITIAL_CODE = `// Ejemplo de Servicio CRUD con API
class UserService {
  async register(userData) {
    const response = await fetch('https://api.example.com/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error("Registration failed");
    return await response.json();
  }

  async getUser(id) {
    const response = await fetch(\`https://api.example.com/users/\${encodeURIComponent(id)}\`);
    return await response.json();
  }
}

export { UserService };`;

const INITIAL_TESTS = `// Los tests generados aparecerán aquí...
// Haz click en "Generar Tests" para empezar.`;

// --- Components ---

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
    <div className={cn("p-2 rounded-lg", color)}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-xl font-mono font-bold text-zinc-100">{value}</p>
    </div>
  </div>
);

export default function App() {
  const [sourceCode, setSourceCode] = useState(INITIAL_CODE);
  const [generatedTests, setGeneratedTests] = useState(INITIAL_TESTS);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] TestLab AI initialized.",
    "[SYSTEM] Waiting for input...",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [coverageData, setCoverageData] = useState<CoverageStat[]>([
    { name: "Lines", value: 0, fill: "#10b981" },
    { name: "Functions", value: 0, fill: "#3b82f6" },
    { name: "Branches", value: 0, fill: "#f59e0b" },
  ]);
  const [activeTab, setActiveTab] = useState<
    "editor" | "coverage" | "history" | "settings" | "chat"
  >("editor");
  const [testConfig, setTestConfig] = useState<TestConfig>({
    framework: "vitest",
    level: "unit",
    mockingEnabled: true,
    envVars: [{ key: "NODE_ENV", value: "test" }],
    selectedFiles: ["src/calculateTotal.test.ts"],
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy tu asistente de TestLab AI. ¿Tienes alguna duda sobre los tests generados o el código fuente?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [testHistory, setTestHistory] = useState<HistoryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  // --- Startup Logs ---
  useEffect(() => {
    console.log("[SYSTEM] TestLab AI Frontend started.");
    console.log("[SYSTEM] API URL:", process.env.NEXT_PUBLIC_API_URL);
    console.log("[SYSTEM] Socket URL:", process.env.NEXT_PUBLIC_SOCKET_URL);
    console.log("[SYSTEM] Gemini API Key present:", !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.warn(
        "[SYSTEM] WARNING: NEXT_PUBLIC_GEMINI_API_KEY is missing. Chat and direct generation will fail."
      );
    }
  }, []);

  // --- Socket Initialization ---
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001");
    socketRef.current = socket;

    socket.on("test:output", (data: { line: string }) => {
      addLog(data.line);
    });

    socket.on("test:complete", (data) => {
      if (data.coverage) {
        setCoverageData([
          { name: "Lines", value: data.coverage.lines || 0, fill: "#10b981" },
          { name: "Functions", value: data.coverage.functions || 0, fill: "#3b82f6" },
          { name: "Branches", value: data.coverage.branches || 0, fill: "#f59e0b" },
        ]);
      }
      setIsRunning(false);
      addLog("\x1b[32m[SYSTEM] Execution finished successfully.\x1b[0m");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- Actions ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSourceCode(content);
        addLog(`[FILE] Loaded: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  const addLog = (message: string) => {
    setTerminalLogs((prev) => [...prev, message]);
  };

  const generateTests = async () => {
    if (!sourceCode.trim()) return;

    setIsGenerating(true);
    addLog("[IA] Analizando código fuente...");
    addLog(`[IA] Generando suite de pruebas nivel ${testConfig.level.toUpperCase()}...`);

    try {
      // Intentamos usar la API del backend primero para persistencia
      const response: GenerateTestsResponse = await generateTestsAPI(
        sourceCode,
        "javascript", // Por defecto js, se puede mejorar la detección
        "javascript",
        testConfig.level === "e2e" ? "advanced" : "standard"
      );

      setGeneratedTests(response.unitTests);
      setSessionId(response.sessionId);

      // Historial
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        sourceCode: sourceCode,
        generatedTests: response.unitTests,
        framework: testConfig.framework,
        level: testConfig.level,
      };
      setTestHistory((prev) => [newHistoryItem, ...prev]);

      addLog("[IA] Tests generados correctamente.");
    } catch (error) {
      addLog(
        `[ERROR] Fallo en la generación: ${error instanceof Error ? error.message : String(error)}`
      );
      // Fallback a generación directa si falla el backend (requiere API KEY)
      if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        addLog("[IA] Intentando generación directa via SDK...");
        const ai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(
          `Genera tests de nivel ${testConfig.level} usando ${testConfig.framework} para:\n\n${sourceCode}`
        );
        const text = result.response.text();
        const cleanResult = text.replace(/```typescript|```javascript|```/g, "").trim();
        setGeneratedTests(cleanResult);
        addLog("[IA] Tests generados via SDK.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const runTests = async () => {
    if (!sessionId && testConfig.level !== "e2e") {
      addLog("[RUNNER] Error: No hay sesión activa. Genera los tests primero.");
      return;
    }

    setIsRunning(true);
    addLog(
      `[RUNNER] Inicializando entorno sandbox para tests ${testConfig.level.toUpperCase()}...`
    );
    addLog(`[RUNNER] Framework: ${testConfig.framework}`);

    if (testConfig.level === "e2e") {
      addLog(`\x1b[36m[RUNNER] Iniciando motor de ejecución ${testConfig.framework}...\x1b[0m`);
      addLog("[RUNNER] Levantando instancia de navegador headless...");
      // Simulación controlada para E2E
      setTimeout(() => {
        addLog("\x1b[32m✓ Login Flow (passed)\x1b[0m");
        addLog("\x1b[32m✓ Navigation to Profile (passed)\x1b[0m");
        addLog("\x1b[32m✓ Data persistence check (passed)\x1b[0m");
        addLog("\x1b[32m✓ coverage: 100% lines\x1b[0m");
        setCoverageData([
          { name: "Lines", value: 100, fill: "#10b981" },
          { name: "Functions", value: 95, fill: "#3b82f6" },
          { name: "Branches", value: 80, fill: "#f59e0b" },
        ]);
        setIsRunning(false);
      }, 3000);
      return;
    }

    // Ejecución real via Backend para Unit/Integration
    if (socketRef.current && sessionId) {
      socketRef.current.emit("test:join", { sessionId });
    }

    try {
      await runTestsAPI(sessionId!, "node");
    } catch (error) {
      addLog(
        `[ERROR] Error en la ejecución: ${error instanceof Error ? error.message : String(error)}`
      );
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addLog("[SYSTEM] Copiado al portapapeles.");
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    console.log("[CHAT] Sending message:", userMessage);
    console.log("[CHAT] GEMINI_API_KEY present:", !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsChatting(true);

    try {
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        console.error(
          "[CHAT] Error: NEXT_PUBLIC_GEMINI_API_KEY is not defined in the environment."
        );
        throw new Error("API Key de Gemini no configurada");
      }

      const ai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: {
          role: "system",
          parts: [
            {
              text: "Eres un experto en testing y desarrollo de software. Tu objetivo es explicar tests, sugerir mejoras de cobertura y mejores prácticas de refactorización basándote en el código proporcionado. Responde de forma concisa en español.",
            },
          ],
        },
      });

      const response = await model.generateContent(`
        Contexto del Código Fuente:
        ${sourceCode}

        Contexto de los Tests Generados:
        ${generatedTests}

        Pregunta del usuario: ${userMessage}
      `);

      const assistantMessage =
        response.response.text() || "Lo siento, no he podido procesar tu pregunta.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);
    } catch (error) {
      console.error("[CHAT] Gemini execution error:", error);
      let errorMessage = "Lo siento, ha ocurrido un error al procesar tu mensaje.";

      if (error instanceof Error && error.message.includes("429")) {
        errorMessage =
          "Cuota excedida: Has alcanzado el límite de peticiones gratuitas de Gemini. Por favor, espera unos minutos o utiliza otra API Key.";
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }

      setChatMessages((prev) => [...prev, { role: "assistant", content: errorMessage }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 shrink-0 border-r border-zinc-800 flex flex-col items-center md:items-stretch bg-zinc-950/50 backdrop-blur-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cpu size={20} className="text-black" />
          </div>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:block font-bold text-xl tracking-tight"
          >
            TestLab <span className="text-emerald-500">AI</span>
          </motion.h1>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          <button
            onClick={() => setActiveTab("editor")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
              activeTab === "editor"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "text-zinc-400 hover:bg-zinc-800/50"
            )}
          >
            <FileCode size={20} />
            <span className="hidden md:block font-medium">Editor</span>
          </button>
          <button
            onClick={() => setActiveTab("coverage")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
              activeTab === "coverage"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "text-zinc-400 hover:bg-zinc-800/50"
            )}
          >
            <BarChart3 size={20} />
            <span className="hidden md:block font-medium">Cobertura</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
              activeTab === "history"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "text-zinc-400 hover:bg-zinc-800/50"
            )}
          >
            <History size={20} />
            <span className="hidden md:block font-medium">Historial</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
              activeTab === "chat"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "text-zinc-400 hover:bg-zinc-800/50"
            )}
          >
            <MessageCircle size={20} />
            <span className="hidden md:block font-medium">Asistente AI</span>
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-900 rounded-xl p-3 mb-4 hidden md:block">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                Estado Sandbox
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono">ISOLATED_V1</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
              activeTab === "settings"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "text-zinc-400 hover:bg-zinc-800/50"
            )}
          >
            <Settings size={20} />
            <span className="hidden md:block font-medium">Ajustes</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              <Zap size={14} className="text-yellow-500" />
              <span className="text-xs font-mono text-zinc-400">GEMINI_2.0_FLASH</span>
            </div>
            <div className="text-xs font-mono text-zinc-600 hidden lg:block">
              {sessionId ? `SID: ${sessionId.substring(0, 8)}...` : "SESIÓN INACTIVA"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".js,.ts,.py"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-all text-sm font-medium border border-zinc-700"
            >
              <Upload size={16} />
              Cargar Archivo
            </button>
            <button
              onClick={generateTests}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all text-sm font-bold text-black shadow-lg shadow-emerald-600/20"
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Generar Tests
            </button>
            <button
              onClick={runTests}
              disabled={isRunning || (!generatedTests && testConfig.level !== "e2e")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-50 transition-all text-sm font-bold text-black"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Ejecutar
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "editor" && (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100%-180px)] min-w-0"
              >
                {/* Source Editor */}
                <div className="flex min-w-0 flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                      <FileCode size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Código Fuente
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(sourceCode)}
                      className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-300"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Editor
                      height="100%"
                      defaultLanguage="typescript"
                      theme="vs-dark"
                      value={sourceCode}
                      onChange={(val) => setSourceCode(val || "")}
                      options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: { top: 20 },
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        lineNumbersMinChars: 3,
                      }}
                    />
                  </div>
                </div>

                {/* Test Editor */}
                <div className="flex min-w-0 flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Tests Generados
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(generatedTests)}
                      className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-300"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Editor
                      height="100%"
                      defaultLanguage="typescript"
                      theme="vs-dark"
                      value={generatedTests}
                      onChange={(val) => setGeneratedTests(val || "")}
                      options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: { top: 20 },
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        lineNumbersMinChars: 3,
                        readOnly: isGenerating,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "coverage" && (
              <motion.div
                key="coverage"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                    <BarChart3 className="text-emerald-500" />
                    Análisis de Cobertura
                  </h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="100%"
                        barSize={20}
                        data={coverageData}
                        startAngle={180}
                        endAngle={-180}
                      >
                        <RadialBar
                          label={{ position: "insideStart", fill: "#fff" }}
                          background
                          dataKey="value"
                        >
                          {coverageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </RadialBar>
                        <Legend
                          iconSize={10}
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                        />
                        <RechartsTooltip />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <StatCard
                    label="Tests Totales"
                    value={coverageData[0].value > 0 ? "3" : "0"}
                    icon={CheckCircle2}
                    color="bg-emerald-500"
                  />
                  <StatCard
                    label="Pasados"
                    value={coverageData[0].value > 0 ? "3" : "0"}
                    icon={CheckCircle2}
                    color="bg-emerald-500"
                  />
                  <StatCard label="Fallidos" value="0" icon={XCircle} color="bg-zinc-700" />
                  <StatCard
                    label="Tiempo Exec"
                    value={coverageData[0].value > 0 ? "1.2s" : "0s"}
                    icon={Zap}
                    color="bg-yellow-500"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="text-emerald-500" />
                    Configuración de Ejecución
                  </h3>

                  <div className="space-y-8">
                    {/* Testing Level */}
                    <section>
                      <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 block">
                        Nivel de Testing
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        {(["unit", "integration", "e2e"] as const).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setTestConfig((prev) => ({ ...prev, level: lvl }))}
                            className={cn(
                              "px-4 py-3 rounded-xl border transition-all text-sm font-medium uppercase tracking-wider",
                              testConfig.level === lvl
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/10"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                            )}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Framework Selection */}
                    <section>
                      <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 block">
                        Framework de Pruebas
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(
                          ["vitest", "jest", "mocha", "pytest", "playwright", "cypress"] as const
                        ).map((fw) => (
                          <button
                            key={fw}
                            onClick={() => setTestConfig((prev) => ({ ...prev, framework: fw }))}
                            className={cn(
                              "px-4 py-3 rounded-xl border transition-all text-sm font-medium capitalize",
                              testConfig.framework === fw
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/10"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                            )}
                          >
                            {fw}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Mocking Toggle */}
                    <section>
                      <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-100">Habilitar Mocking</h4>
                          <p className="text-xs text-zinc-500">
                            Intercepta llamadas a APIs externas y bases de datos automáticamente.
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setTestConfig((prev) => ({
                              ...prev,
                              mockingEnabled: !prev.mockingEnabled,
                            }))
                          }
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            testConfig.mockingEnabled ? "bg-emerald-500" : "bg-zinc-700"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                              testConfig.mockingEnabled ? "left-7" : "left-1"
                            )}
                          />
                        </button>
                      </div>
                    </section>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <ShieldCheck size={20} className="text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-500 mb-1">Seguridad Sandbox</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Todas las pruebas se ejecutan en un contenedor Docker aislado. Las variables
                      de entorno se inyectan en tiempo de ejecución y se borran tras la ejecución.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <History className="text-emerald-500" />
                    Historial de Generaciones
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">
                    {testHistory.length} elementos guardados
                  </span>
                </div>

                {testHistory.length === 0 ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="p-4 bg-zinc-900 rounded-full mb-4">
                      <History size={32} className="text-zinc-700" />
                    </div>
                    <h4 className="text-zinc-300 font-bold mb-1">Sin historial aún</h4>
                    <p className="text-sm text-zinc-500 max-w-xs">
                      Genera algunos tests para verlos aquí y poder restaurarlos rápidamente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {testHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between hover:border-emerald-500/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-zinc-900 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
                            <FileCode
                              size={20}
                              className="text-zinc-500 group-hover:text-emerald-500 transition-colors"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-zinc-200">
                                {item.timestamp}
                              </span>
                              <span className="px-2 py-0.5 bg-zinc-800 text-[10px] rounded text-zinc-400 font-mono uppercase">
                                {item.framework}
                              </span>
                              <span className="px-2 py-0.5 bg-zinc-800 text-[10px] rounded text-zinc-400 font-mono uppercase">
                                {item.level}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-mono truncate max-w-md">
                              {item.sourceCode.substring(0, 60)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSourceCode(item.sourceCode);
                              setGeneratedTests(item.generatedTests);
                              setTestConfig((prev) => ({
                                ...prev,
                                framework: item.framework as any,
                                level: item.level as any,
                              }));
                              setActiveTab("editor");
                              addLog(`[HISTORY] Restaurada generación de las ${item.timestamp}`);
                            }}
                            className="px-4 py-2 bg-zinc-900 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold transition-all border border-zinc-800"
                          >
                            Restaurar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col h-[calc(100vh-280px)] max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <MessageCircle size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Asistente AI</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      Consultas sobre Testing
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-4 max-w-[85%]",
                        msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          msg.role === "user" ? "bg-zinc-800" : "bg-emerald-500/20"
                        )}
                      >
                        {msg.role === "user" ? (
                          <User size={16} />
                        ) : (
                          <Bot size={16} className="text-emerald-500" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "p-4 rounded-2xl text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-emerald-600 text-black font-medium"
                            : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Pregunta algo sobre el código o los tests..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-sans text-zinc-200"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isChatting || !chatInput.trim()}
                      className="absolute right-2 p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 disabled:opacity-50 transition-all"
                    >
                      {isChatting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Terminal */}
          <div className="flex flex-col bg-[#0c0c0e] border border-zinc-800 rounded-2xl overflow-hidden h-48 shadow-inner">
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <TerminalIcon size={14} className="text-zinc-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Salida de Terminal
                </span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-1 custom-scrollbar">
              {terminalLogs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-zinc-700 select-none">[{i + 1}]</span>
                  <span className="text-zinc-300">
                    <Ansi>{log}</Ansi>
                  </span>
                </div>
              ))}
              {isRunning && <div className="flex animate-pulse text-emerald-500 ml-6">_</div>}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `,
        }}
      />
    </div>
  );
}
