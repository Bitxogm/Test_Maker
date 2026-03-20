"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  FlaskConical,
  Terminal as TerminalIcon,
  Play,
  Copy,
  FileUp,
  Code2,
  Sparkles,
  Zap,
  PieChart,
} from "lucide-react";
import { io } from "socket.io-client";
import { generateTests, runTests, GenerateTestsResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { AppSidebar } from "@/components/AppSidebar";
import ChatWindow from "@/components/ChatWindow";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import Ansi from "ansi-to-react";

export default function TestLabPage() {
  const [code, setCode] = useState("// Escribe o carga tu código aquí...");
  const [language, setLanguage] = useState("javascript");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [generatedTests, setGeneratedTests] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [coverage, setCoverage] = useState<Record<string, number> | null>(null);
  const [activeTab, setActiveTab] = useState("tests");
  const [copiedTests, setCopiedTests] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const socketRef = React.useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("test:output", (data: { line: string }) => {
      setTerminalOutput((prev) => [...prev, data.line]);
    });

    socket.on("test:complete", (data) => {
      if (data.coverage) setCoverage(data.coverage);
      setIsRunning(false);
      setTerminalOutput((prev) => [...prev, "\n✓ Ejecución completada."]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setTerminalOutput(["[IA] Analizando código...", "[IA] Generando suite de pruebas..."]);
    try {
      const response: GenerateTestsResponse = await generateTests(
        code,
        language,
        language,
        "advanced"
      );
      setGeneratedTests(response.unitTests);
      setSessionId(response.sessionId);
      setTerminalOutput((prev) => [...prev, "✓ Tests generados correctamente."]);
      setActiveTab("tests");
    } catch {
      setTerminalOutput((prev) => [...prev, "⨯ Error generando tests."]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRun = async () => {
    if (!sessionId) return;
    setIsRunning(true);
    setTerminalOutput([
      "[RUN] Iniciando entorno de pruebas...",
      "[RUN] Ejecutando sandbox Docker...",
    ]);
    setActiveTab("live");

    // Join the session room so socket events reach this client
    if (socketRef.current) {
      socketRef.current.emit("test:join", { sessionId });
    }

    try {
      await runTests(sessionId, language === "python" ? "python" : "node");
    } catch {
      setTerminalOutput((prev) => [...prev, "⨯ Error de ejecución."]);
      setIsRunning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setCode(content);
      const ext = file.name.split(".").pop();
      if (ext === "js" || ext === "ts") setLanguage("javascript");
      if (ext === "py") setLanguage("python");
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (text: string, type: "tests" | "output") => {
    navigator.clipboard.writeText(text);
    if (type === "tests") {
      setCopiedTests(true);
      setTimeout(() => setCopiedTests(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  const onLanguageChange = (val: string | null) => {
    if (val) setLanguage(val);
  };

  return (
    <div className="flex h-screen w-full bg-dark-900 text-gray-100 overflow-hidden font-sans">
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-14 border-b border-dark-700 bg-dark-800 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold tracking-widest text-white flex items-center gap-2">
              PROYECTO: <span className="text-neon-cyan">SANDBOX_V1</span>
            </h1>
            <div className="h-4 w-px bg-dark-600" />
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={onLanguageChange}>
                <SelectTrigger className="w-32 h-8 bg-dark-900 border-dark-600 text-[11px] font-bold uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-800 border-dark-600">
                  <SelectItem value="javascript">JAVASCRIPT</SelectItem>
                  <SelectItem value="python">PYTHON</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-dark-600 text-[11px] font-bold uppercase"
                  onClick={() =>
                    (document.getElementById("file-upload") as HTMLInputElement)?.click()
                  }
                >
                  <FileUp className="w-3 h-3 mr-2" />
                  Cargar Archivo
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".js,.ts,.py"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-8 bg-neon-purple text-white hover:bg-neon-purple/80 text-[11px] font-bold uppercase shadow-[0_0_10px_rgba(191,0,255,0.3)]"
            >
              {isGenerating ? (
                <Zap className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-2" />
              )}
              Generar Tests
            </Button>
            <Button
              onClick={handleRun}
              disabled={isRunning || !generatedTests}
              className="h-8 bg-neon-cyan text-black hover:bg-neon-cyan/80 text-[11px] font-bold uppercase shadow-[0_0_10px_rgba(0,255,245,0.3)]"
            >
              {isRunning ? (
                <Play className="w-3 h-3 mr-2 animate-pulse" />
              ) : (
                <Play className="w-3 h-3 mr-2" />
              )}
              Ejecutar
            </Button>
          </div>
        </header>
        <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={45} minSize={30} className="flex flex-col bg-black/20">
            <header className="h-10 flex items-center justify-between px-4 border-b border-dark-800 bg-dark-800/50 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center">
                <Code2 className="w-3 h-3 mr-2" /> Editor de Código
              </span>
            </header>
            <div className="flex-1 relative">
              <Editor
                height="100%"
                theme="vs-dark"
                language={language}
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  fontFamily: "var(--font-geist-mono)",
                  padding: { top: 20 },
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="bg-dark-700 w-1.5 hover:bg-neon-cyan/50 transition-colors"
          />

          <ResizablePanel defaultSize={35} minSize={25} className="flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val)}
              className="flex-1 flex flex-col min-h-0"
            >
              <header className="h-10 border-b border-dark-800 bg-dark-800/50 flex items-center shrink-0">
                <TabsList className="bg-transparent border-none p-0 h-full w-full justify-start rounded-none">
                  <TabsTrigger
                    value="tests"
                    className="h-full rounded-none px-4 text-[10px] font-bold uppercase border-b-2 border-transparent data-[state=active]:border-neon-purple data-[state=active]:bg-neon-purple/10 data-[state=active]:text-neon-purple"
                  >
                    <FlaskConical className="w-3 h-3 mr-2" /> Tests
                  </TabsTrigger>
                  <TabsTrigger
                    value="live"
                    className="h-full rounded-none px-4 text-[10px] font-bold uppercase border-b-2 border-transparent data-[state=active]:border-neon-cyan data-[state=active]:bg-neon-cyan/10 data-[state=active]:text-neon-cyan"
                  >
                    <TerminalIcon className="w-3 h-3 mr-2" /> Terminal
                  </TabsTrigger>
                  <TabsTrigger
                    value="coverage"
                    className="h-full rounded-none px-4 text-[10px] font-bold uppercase border-b-2 border-transparent data-[state=active]:border-neon-green data-[state=active]:bg-neon-green/10 data-[state=active]:text-neon-green"
                  >
                    <PieChart className="w-3 h-3 mr-2" /> Cobertura
                  </TabsTrigger>
                </TabsList>
              </header>

              <div className="flex-1 overflow-hidden relative">
                <TabsContent value="tests" className="h-full m-0 p-0 relative">
                  {generatedTests && (
                    <Button
                      onClick={() => copyToClipboard(generatedTests, "tests")}
                      className="absolute top-4 right-4 z-20 h-7 bg-dark-800/80 border border-neon-cyan/50 text-neon-cyan text-[10px] font-bold hover:bg-neon-cyan/20"
                    >
                      {copiedTests ? (
                        "✓ COPIADO"
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-2" /> COPIAR
                        </>
                      )}
                    </Button>
                  )}
                  <ScrollArea className="h-full w-full bg-black/40">
                    <pre className="p-6 text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {generatedTests || "// Los tests generados aparecerán aquí..."}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="live" className="h-full m-0 p-0 overflow-hidden bg-dark-950">
                  {terminalOutput.length > 0 && (
                    <Button
                      onClick={() => copyToClipboard(terminalOutput.join("\n"), "output")}
                      className="absolute top-4 right-4 z-20 h-7 bg-dark-800/80 border border-neon-cyan/30 text-neon-cyan text-[10px] font-bold"
                    >
                      {copiedOutput ? (
                        "✓ COPIADO"
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-2" /> COPIAR
                        </>
                      )}
                    </Button>
                  )}
                  <ScrollArea className="h-full w-full p-4">
                    <div className="font-mono text-[11px] space-y-1">
                      {terminalOutput.map((line, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="opacity-20 select-none">[{i + 1}]</span>
                          <Ansi useClasses>{line}</Ansi>
                        </div>
                      ))}
                      {isRunning && <div className="flex animate-pulse text-neon-cyan ml-6">_</div>}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="coverage" className="h-full m-0 p-6 bg-dark-900/50">
                  {coverage ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          {
                            label: "SENTENCIAS",
                            value: coverage.statements,
                            color: "text-neon-cyan",
                            glow: "glow-cyan",
                          },
                          {
                            label: "RAMAS",
                            value: coverage.branches,
                            color: "text-neon-purple",
                            glow: "glow-purple",
                          },
                          {
                            label: "FUNCIONES",
                            value: coverage.functions,
                            color: "text-neon-green",
                            glow: "glow-green",
                          },
                          {
                            label: "LÍNEAS",
                            value: coverage.lines,
                            color: "text-neon-yellow",
                            glow: "glow-yellow",
                          },
                        ].map((stat) => (
                          <Card
                            key={stat.label}
                            className="p-4 bg-dark-800/50 border-dark-700 shadow-lg"
                          >
                            <h4 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">
                              {stat.label}
                            </h4>
                            <div className="flex items-end justify-between">
                              <span className={`text-2xl font-bold ${stat.color} ${stat.glow}`}>
                                {stat.value}%
                              </span>
                              <div className="w-16 h-1 bg-dark-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full bg-current ${stat.color} transition-all duration-1000`}
                                  style={{ width: `${stat.value}%` }}
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold text-gray-400">
                          <span>COBERTURA TOTAL</span>
                          <span className="text-white">{coverage.statements}%</span>
                        </div>
                        <Progress value={coverage.statements || 0}>
                          <ProgressTrack className="h-1.5 bg-dark-700 shadow-[0_0_5px_rgba(0,255,245,0.2)]">
                            <ProgressIndicator
                              className={
                                (coverage.statements || 0) > 80 ? "bg-neon-green" : "bg-neon-cyan"
                              }
                            />
                          </ProgressTrack>
                        </Progress>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                      <PieChart className="w-12 h-12" />
                      <p className="text-xs max-w-[200px]">
                        Ejecuta los tests para ver las estadísticas detalladas de cobertura.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="bg-dark-700 w-1.5 hover:bg-neon-cyan/50 transition-colors"
          />

          <ResizablePanel defaultSize={20} minSize={15} className="flex flex-col">
            <ChatWindow
              code={code}
              generatedTests={generatedTests}
              terminalOutput={terminalOutput}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
