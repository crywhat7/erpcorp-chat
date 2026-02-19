"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .schema(SCHEMA_ERP)
        .from("usuarios")
        .select("id, nombre, role, avatar_url")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (err || !data) {
        setError("Usuario o contraseña incorrectos.");
        setLoading(false);
        return;
      }
      const row = data as { id: string; nombre: string; role: string; avatar_url: string | null };
      setSession(row.id, row.nombre, row.role ?? "user", row.avatar_url ?? null);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-zinc-900">
      <div className="w-full max-w-sm border border-slate-200 p-8 dark:border-zinc-700 dark:bg-zinc-800">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-black dark:text-white">
          Portal ERP The Times
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-black dark:text-zinc-200">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-200 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-black dark:text-zinc-200">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="border border-black bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:border-white dark:bg-white dark:text-black"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
