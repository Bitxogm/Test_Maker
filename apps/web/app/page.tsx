"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "@/lib/socket";
import { generateTests, runTests } from "@/lib/api";

const DEFAULT_CODE = {
  javascript: `function sum(a, b) {\n  return a + b;\n}`,
  typescript: `function multiply(a: number, b: number): number {\n  return a * b;\n}`,
  python: `def greet(name):\n    return f"Hello, {name}!"`,
};

export default function Dashboard() {
  const [language, setLanguage] = useState<"javascript" | "typescript" | "python">("javascript");
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [generatedTests, setGeneratedTests] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [activeTab, setActiveTab] = useState<"tests" | "live" | "coverage">("tests");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [coverage, setCoverage] = useState({ passed: 0, failed: 0, skipped: 0 });
  const [status, setStatus] = useState<"idle" | "generating" | "running" | "done">("idle");

  useEffect(() => {
    socket.on("test:output", ({ line }: { line: string }) => {
      setTerminalOutput((prev) => [...prev, line]);
    });

    socket.on("test:results", (results: { passed: number; failed: number; skipped: number }) => {
      setCoverage(results);
      setStatus("done");
      setIsRunning(false);
    });

    return () => {
      socket.off("test:output");
      socket.off("test:results");
    };
  }, []);

  const handleLanguageChange = (newLang: "javascript" | "typescript" | "python") => {
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang as keyof typeof DEFAULT_CODE]);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatus("generating");
    try {
      const response = await generateTests(code, language, language, "comprehensive", "user-1");
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
    try {
      await runTests(sessionId, language === "python" ? "python" : "node");
      setActiveTab("live");
    } catch (error) {
      console.error("Execution failed", error);
      setStatus("idle");
      setIsRunning(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-dark-900 text-white font-sans overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-1/2 flex flex-col border-r border-dark-700">
          <header className="h-14 flex items-center justify-between px-6 bg-dark-800 border-b border-dark-700">
            <h2 className="text-neon-cyan font-bold glow-cyan tracking-wider">SOURCE CODE</h2>
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
              <div className="h-full">
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
              <div className="h-full bg-black p-4 font-mono text-neon-green text-sm overflow-auto custom-scrollbar">
                {terminalOutput.length === 0 && (
                  <p className="opacity-50 italic">{"> Waiting for execution..."}</p>
                )}
                {terminalOutput.map((line, i) => (
                  <div key={i} className="mb-1 leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
            )}
            {activeTab === "coverage" && (
              <div className="h-full flex items-center justify-around">
                <div className="text-center">
                  <p className="text-4xl font-bold text-neon-green glow-green mb-2">
                    {coverage.passed}
                  </p>
                  <p className="text-xs tracking-widest opacity-70">PASSED</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-neon-pink mb-2">{coverage.failed}</p>
                  <p className="text-xs tracking-widest opacity-70">FAILED</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-neon-yellow mb-2">{coverage.skipped}</p>
                  <p className="text-xs tracking-widest opacity-70">SKIPPED</p>
                </div>
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
