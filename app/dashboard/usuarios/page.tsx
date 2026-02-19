"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import type { Usuario } from "@/lib/supabase/types";

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin()) {
      router.replace("/dashboard");
      return;
    }
    loadUsuarios();
  }, [router]);

  async function loadUsuarios() {
    const { data } = await supabase
      .schema(SCHEMA_ERP)
      .from("usuarios")
      .select("id, nombre, username, role, avatar_url")
      .order("nombre");
    if (data) setUsuarios(data as Usuario[]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !username.trim() || !password.trim()) {
      setError("Nombre, usuario y contraseña son obligatorios.");
      return;
    }
    const { error: err } = await supabase.schema(SCHEMA_ERP).from("usuarios").insert({
      nombre: nombre.trim(),
      username: username.trim(),
      password: password.trim(),
      role,
    });
    if (err) {
      setError(err.message || "Error al crear (¿usuario duplicado?).");
      return;
    }
    setNombre("");
    setUsername("");
    setPassword("");
    setCreateOpen(false);
    loadUsuarios();
  }

  if (!isAdmin()) return null;

  return (
    <div className="overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-white">Usuarios</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="border border-black bg-black px-4 py-2 text-sm font-medium text-white dark:border-white dark:bg-white dark:text-black"
        >
          + Crear usuario
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {createOpen && (
        <form
          onSubmit={handleCreate}
          className="mb-6 border border-slate-200 p-4 dark:border-zinc-700"
        >
          <h2 className="mb-3 text-sm font-medium text-black dark:text-white">Nuevo usuario</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              className="border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario (login)"
              className="border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className="border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="user">Usuario</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="border border-black bg-black px-3 py-1.5 text-sm text-white dark:border-white dark:bg-white dark:text-black">
              Crear
            </button>
            <button type="button" onClick={() => setCreateOpen(false)} className="border border-slate-200 px-3 py-1.5 text-sm dark:border-zinc-600 dark:text-zinc-200">
              Cancelar
            </button>
          </div>
        </form>
      )}
      <ul className="space-y-2">
        {usuarios.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-4 border border-slate-200 p-3 dark:border-zinc-700"
          >
            <Avatar src={u.avatar_url} alt={u.nombre} size="sm" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-black dark:text-zinc-100">{u.nombre}</span>
              <span className="ml-2 text-slate-500 dark:text-zinc-400">@{u.username}</span>
              {u.role === "admin" && (
                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">admin</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
