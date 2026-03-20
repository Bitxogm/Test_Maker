import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendChatMessage, ChatMessage } from "@/lib/api";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface ChatWindowProps {
  code: string;
  generatedTests: string;
  terminalOutput: string[];
}

export default function ChatWindow({ code, generatedTests, terminalOutput }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputMsg.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: inputMsg };
    setMessages((prev) => [...prev, userMsg]);
    setInputMsg("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        code,
        generatedTests,
        terminalOutput,
        messages,
        userMsg.content
      );
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error de conexión con Gemini." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 border-l border-dark-700">
      <header className="h-14 flex items-center px-4 border-b border-dark-700 bg-dark-800 shrink-0">
        <Sparkles className="w-4 h-4 text-neon-cyan mr-2" />
        <h2 className="text-xs font-bold tracking-widest text-neon-cyan glow-cyan uppercase">
          Gemini Assistant
        </h2>
      </header>

      <div className="flex-1 overflow-hidden bg-black/20">
        <ScrollArea className="h-full px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-12 opacity-40">
              <Bot className="w-12 h-12 text-neon-cyan" />
              <p className="text-xs max-w-[200px] leading-relaxed">
                Pregúntame sobre la lógica de tu código, errores en los tests o cómo mejorar la
                cobertura.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-6 flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1.5 opacity-50 px-1">
                {m.role === "user" ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tú</span>
                    <User className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-neon-cyan" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neon-cyan">
                      Gemini
                    </span>
                  </>
                )}
              </div>
              <div
                className={`px-4 py-2.5 rounded-2xl max-w-[90%] text-sm leading-relaxed border ${
                  m.role === "user"
                    ? "bg-neon-cyan/5 text-neon-cyan border-neon-cyan/20 rounded-tr-none"
                    : "bg-dark-800 text-gray-200 border-dark-600 rounded-tl-none"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex flex-col items-start mb-6">
              <div className="flex items-center gap-2 mb-1.5 opacity-50 px-1">
                <Bot className="w-3 h-3 text-neon-cyan" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon-cyan">
                  Pensando...
                </span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-dark-800 border border-dark-600 flex items-center space-x-2 rounded-tl-none">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </ScrollArea>
      </div>

      <footer className="p-4 border-t border-dark-700 bg-dark-800 shrink-0">
        <form
          className="relative flex items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Preguntar a la IA..."
            className="pr-12 bg-dark-900 border-dark-600 text-white focus-visible:ring-1 focus-visible:ring-neon-cyan rounded-xl h-11"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputMsg.trim()}
            className="absolute right-1.5 top-1.5 h-8 w-8 bg-neon-cyan text-black hover:bg-neon-cyan/80 rounded-lg transition-transform active:scale-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
