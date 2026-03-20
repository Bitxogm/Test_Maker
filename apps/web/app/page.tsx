"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import AnsiToHtml from "ansi-to-html";
import { socket } from "@/lib/socket";
import { generateTests, runTests } from "@/lib/api";
import { isAuthenticated, getUser } from "@/lib/auth";
import Header from "./components/Header";

const DEFAULT_CODE = {
  javascript: `function sum(a, b) {\n  return a + b;\n}`,
  typescript: `function multiply(a: number, b: number): number {\n  return a * b;\n}`,
  python: `def greet(name):\n    return f"Hello, {name}!"`,
};

export default function Dashboard() {
  const router = useRouter();
  const [language, setLanguage] = useState<"javascript" | "typescript" | "python">("javascript");
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [generatedTests, setGeneratedTests] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [activeTab, setActiveTab] = useState<"tests" | "live" | "coverage">("tests");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [coverage, setCoverage] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    coverage: 0,
  });
  const [copiedTests, setCopiedTests] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ansiConverter = new AnsiToHtml({
    fg: "#fff",
    bg: "#000",
    newline: true,
    escapeXML: true,
  });
  const [status, setStatus] = useState<"idle" | "generating" | "running" | "done">("idle");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setUser(getUser());

    socket.on("connect", () => console.log("🔌 Socket conectado:", socket.id));
    socket.on("disconnect", () => console.log("❌ Socket desconectado"));

    socket.on("test:output", ({ line }: { line: string }) => {
      console.log("📨 Línea recibida:", line);
      setTerminalOutput((prev) => [...prev, line]);
    });

    socket.on("test:complete", (parsedResult: any) => {
      if (parsedResult?.summary) {
        setCoverage({
          total: parsedResult.summary.total || 0,
          passed: parsedResult.summary.passed || 0,
          failed: parsedResult.summary.failed || 0,
          skipped: parsedResult.summary.skipped || 0,
          coverage: parsedResult.summary.coverage || 0,
        });
      }
      setStatus("done");
      setIsRunning(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("test:output");
      socket.off("test:complete");
    };
  }, [router]);

  const handleLanguageChange = (newLang: "javascript" | "typescript" | "python") => {
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang as keyof typeof DEFAULT_CODE]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setCode(content);

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "py") setLanguage("python");
      else if (ext === "ts" || ext === "tsx") setLanguage("typescript");
      else setLanguage("javascript");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);
    setStatus("generating");
    try {
      const response = await generateTests(
        code,
        language,
        language,
        "comprehensive",
        user.id || user.sub || "anonymous"
      );
      setGeneratedTests(response.unitTests);
      setSessionId(response.sessionId);
      setStatus("idle");
    } catch (error) {
      console.error("Generation failed", error);
      setStatus("idle");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRun = async () => {
    if (!sessionId) return;
    setIsRunning(true);
    setStatus("running");
    setTerminalOutput([]);
    setActiveTab("live");

    // Esperar confirmación de join antes de ejecutar
    console.log("🚀 Uniéndose a sala:", sessionId);
    await new Promise<void>((resolve) => {
      socket.emit("test:join", { sessionId });
      socket.once("test:joined", () => {
        console.log("✅ Unido a sala correctamente");
        resolve();
      });
      setTimeout(() => {
        console.warn("⏳ Timeout esperando test:joined, continuando...");
        resolve();
      }, 1000); // fallback por si acaso
    });

    console.log("▶ Ejecutando tests...");

    try {
      await runTests(sessionId, language === "python" ? "python" : "node");
      setStatus("done");
    } catch (error) {
      console.error("Execution failed", error);
      setStatus("idle");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-dark-900 text-white font-sans overflow-hidden">
      <Header />
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-1/2 flex flex-col border-r border-dark-700">
          <header className="h-14 flex items-center justify-between px-6 bg-dark-800 border-b border-dark-700">
            <h2 className="text-neon-cyan font-bold glow-cyan tracking-wider">SOURCE CODE</h2>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".js,.ts,.py"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 border border-neon-purple text-neon-purple text-sm hover:bg-neon-purple/10 transition-all font-bold"
              >
                📂 Cargar Archivo
              </button>
              <select
                value={language}
                onChange={(e) =>
                  handleLanguageChange(e.target.value as "javascript" | "typescript" | "python")
                }
                className="bg-dark-900 border border-neon-cyan text-neon-cyan text-sm px-3 py-1 outline-none focus:glow-cyan transition-all"
              >
                <option value="javascript">JAVASCRIPT</option>
                <option value="typescript">TYPESCRIPT</option>
                <option value="python">PYTHON</option>
              </select>
            </div>
          </header>
          <div className="flex-1">
            <Editor
              height="calc(100vh - 120px)"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 10 },
              }}
            />
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-1/2 flex flex-col bg-dark-800">
          <header className="h-14 flex bg-dark-700 border-b border-dark-600">
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex-1 text-sm font-bold tracking-widest transition-all ${activeTab === "tests" ? "text-neon-purple glow-purple border-b-2 border-neon-purple bg-dark-600" : "text-gray-400 hover:text-white"}`}
            >
              TESTS GENERADOS
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 text-sm font-bold tracking-widest transition-all ${activeTab === "live" ? "text-neon-green glow-green border-b-2 border-neon-green bg-dark-600" : "text-gray-400 hover:text-white"}`}
            >
              EJECUCIÓN EN VIVO
            </button>
            <button
              onClick={() => setActiveTab("coverage")}
              className={`flex-1 text-sm font-bold tracking-widest transition-all ${activeTab === "coverage" ? "text-neon-yellow border-b-2 border-neon-yellow bg-dark-600" : "text-gray-400 hover:text-white"}`}
            >
              COVERAGE
            </button>
          </header>

          <div className="flex-1 overflow-auto p-4">
            {activeTab === "tests" && (
              <div className="h-full relative">
                {generatedTests && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTests);
                      setCopiedTests(true);
                      setTimeout(() => setCopiedTests(false), 2000);
                    }}
                    className="absolute top-2 right-4 z-10 px-2 py-1 text-xs font-bold border border-neon-cyan text-neon-cyan bg-dark-900/80 hover:bg-neon-cyan/10 transition-all"
                  >
                    {copiedTests ? "✓ COPIADO" : "📋 COPIAR"}
                  </button>
                )}
                <Editor
                  height="100%"
                  language={language}
                  theme="vs-dark"
                  value={generatedTests}
                  options={{
                    readOnly: true,
                    fontSize: 14,
                    minimap: { enabled: false },
                    automaticLayout: true,
                  }}
                />
              </div>
            )}
            {activeTab === "live" && (
              <div className="h-full relative bg-black font-mono text-neon-green text-sm overflow-hidden flex flex-col">
                {terminalOutput.length > 0 && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(terminalOutput.join("\n"));
                      setCopiedOutput(true);
                      setTimeout(() => setCopiedOutput(false), 2000);
                    }}
                    className="absolute top-2 right-4 z-10 px-2 py-1 text-xs font-bold border border-neon-cyan text-neon-cyan bg-dark-900/80 hover:bg-neon-cyan/10 transition-all"
                  >
                    {copiedOutput ? "✓ COPIADO" : "📋 COPIAR"}
                  </button>
                )}
                <div className="flex-1 overflow-auto custom-scrollbar p-4">
                  {terminalOutput.length === 0 && (
                    <p className="opacity-50 italic">{"> Waiting for execution..."}</p>
                  )}
                  {terminalOutput.map((line, i) => (
                    <div
                      key={i}
                      className="mb-1 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(line) }}
                    />
                  ))}
                </div>
              </div>
            )}
            {activeTab === "coverage" && (
              <div className="h-full flex flex-col p-8">
                <div className="flex items-center justify-around mb-12">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-neon-green glow-green mb-2">
                      {coverage.passed}
                    </p>
                    <p className="text-xs tracking-widest opacity-70">PASSED</p>
                  </div>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-neon-pink mb-2">{coverage.failed}</p>
                    <p className="text-xs tracking-widest opacity-70">FAILED</p>
                  </div>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-neon-yellow mb-2">{coverage.skipped}</p>
                    <p className="text-xs tracking-widest opacity-70">SKIPPED</p>
                  </div>
                </div>

                {coverage.total > 0 && (
                  <div className="mt-auto mb-8 px-4">
                    <div className="flex justify-between text-sm mb-2 font-bold tracking-widest">
                      <span className="text-neon-green">PROGRESS</span>
                      <span className="text-neon-cyan">
                        {coverage.passed} / {coverage.total} TESTS
                      </span>
                    </div>
                    <div className="h-4 w-full bg-dark-700 overflow-hidden border border-dark-600">
                      <div
                        className="h-full bg-neon-green glow-green transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.round((coverage.passed / coverage.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <footer className="h-16 bg-dark-900 border-t border-dark-700 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2 border border-neon-cyan text-neon-cyan font-bold tracking-widest hover:bg-neon-cyan/10 hover:glow-cyan transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? "GENERANDO..." : "⚡ GENERAR TESTS"}
          </button>
          <button
            onClick={handleRun}
            disabled={!generatedTests || isRunning}
            className="px-6 py-2 border border-neon-green text-neon-green font-bold tracking-widest hover:bg-neon-green/10 hover:glow-green transition-all disabled:opacity-30 disabled:pointer-events-none disabled:border-gray-600 disabled:text-gray-600"
          >
            {isRunning ? "EJECUTANDO..." : "▶ EJECUTAR"}
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              status === "generating"
                ? "bg-neon-cyan animate-pulse"
                : status === "running"
                  ? "bg-neon-green animate-pulse"
                  : status === "done"
                    ? "bg-neon-purple shadow-[0_0_8px_#bf00ff]"
                    : "bg-gray-600"
            }`}
          />
          <span className="text-xs font-bold tracking-widest opacity-70 uppercase">{status}</span>
        </div>
      </footer>
    </main>
  );
}
