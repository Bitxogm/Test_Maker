"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-md bg-dark-800 border-2 border-neon-purple p-8 shadow-[0_0_20px_rgba(191,0,255,0.1)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-neon-purple glow-purple mb-2">TESTLAB AI</h1>
          <p className="text-sm tracking-[0.2em] text-gray-400 font-bold uppercase">REGISTRO</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-neon-pink/10 border border-neon-pink text-neon-pink text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Nombre
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-dark-900 border border-dark-600 focus:border-neon-purple text-white p-3 outline-none transition-all font-mono"
              placeholder="Kusanagi"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-dark-900 border border-dark-600 focus:border-neon-purple text-white p-3 outline-none transition-all font-mono"
              placeholder="user@neutral.net"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-dark-900 border border-dark-600 focus:border-neon-purple text-white p-3 outline-none transition-all font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-transparent border-2 border-neon-purple text-neon-purple font-bold p-3 tracking-[0.3em] hover:bg-neon-purple/10 hover:glow-purple transition-all disabled:opacity-50"
          >
            {loading ? "REGISTRANDO..." : "UNIRSE AL LAB"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-xs text-gray-400 hover:text-neon-purple transition-all tracking-wider font-bold"
          >
            ¿YA TIENES CUENTA?{" "}
            <span className="text-neon-purple border-b border-neon-purple/30">LOGIN</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
