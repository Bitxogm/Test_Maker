"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        router.push("/");
      } else {
        setError(data.message || "Login failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-md bg-dark-800 border-2 border-neon-cyan p-8 shadow-[0_0_20px_rgba(0,255,245,0.1)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-neon-cyan glow-cyan mb-2">TESTLAB AI</h1>
          <p className="text-sm tracking-[0.2em] text-gray-400 font-bold uppercase">
            INICIAR SESIÓN
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-neon-pink/10 border border-neon-pink text-neon-pink text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 focus:border-neon-cyan text-white p-3 outline-none transition-all font-mono"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 focus:border-neon-cyan text-white p-3 outline-none transition-all font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-transparent border-2 border-neon-cyan text-neon-cyan font-bold p-3 tracking-[0.3em] hover:bg-neon-cyan/10 hover:glow-cyan transition-all disabled:opacity-50"
          >
            {loading ? "ACCEDIENDO..." : "ACCEDER"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/register"
            className="text-xs text-gray-400 hover:text-neon-cyan transition-all tracking-wider font-bold"
          >
            ¿NO TIENES CUENTA?{" "}
            <span className="text-neon-cyan border-b border-neon-cyan/30">REGISTRARSE</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
