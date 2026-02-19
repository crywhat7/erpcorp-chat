"use client";

import { useEffect, useState } from "react";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getUserId, isAdmin } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import type { Usuario } from "@/lib/supabase/types";

export default function UsuariosPage() {
  const admin = isAdmin();
  const currentUserId = getUserId();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsuarios();
  }, []);

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

  async function handleUpdate(
    id: string,
    data: { nombre?: string; username?: string; password?: string; role?: "user" | "admin" }
  ) {
    setError("");
    const updates: Record<string, string> = {};
    if (data.nombre !== undefined) updates.nombre = data.nombre.trim();
    if (data.username !== undefined) updates.username = data.username.trim();
    if (data.password !== undefined && data.password) updates.password = data.password;
    if (data.role !== undefined) updates.role = data.role;
    if (Object.keys(updates).length === 0) {
      setEditingId(null);
      return;
    }
    const { error: err } = await supabase
      .schema(SCHEMA_ERP)
      .from("usuarios")
      .update(updates)
      .eq("id", id);
    if (err) {
      setError(err.message || "Error al guardar.");
      return;
    }
    setEditingId(null);
    loadUsuarios();
  }

  async function handleDelete(id: string, nombre: string) {
    if (id === currentUserId) {
      setError("No podés eliminarte a vos mismo.");
      return;
    }
    const admins = usuarios.filter((u) => u.role === "admin");
    if (admins.length === 1 && admins[0].id === id) {
      setError("No se puede eliminar el único administrador.");
      return;
    }
    if (!confirm(`¿Eliminar al usuario "${nombre}"?`)) return;
    await supabase.schema(SCHEMA_ERP).from("usuarios").delete().eq("id", id);
    setEditingId(null);
    loadUsuarios();
  }

  return (
    <div className="overflow-auto p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-black dark:text-white">Control de usuarios</h1>
        {admin ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border border-black bg-black px-4 py-2 text-sm font-medium text-white dark:border-white dark:bg-white dark:text-black"
          >
            + Crear usuario
          </button>
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Solo los administradores pueden crear, editar o eliminar usuarios.
          </p>
        )}
      </div>

      {!admin && (
        <div className="mb-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Para gestionar usuarios tenés que iniciar sesión como administrador.
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {admin && createOpen && (
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
            className="flex flex-wrap items-center gap-4 border border-slate-200 p-3 dark:border-zinc-700"
          >
            {editingId === u.id && admin ? (
              <EditarUsuarioForm
                usuario={u}
                onGuardar={(data) => handleUpdate(u.id, data)}
                onCancelar={() => setEditingId(null)}
              />
            ) : (
              <>
                <Avatar src={u.avatar_url} alt={u.nombre} size="sm" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-black dark:text-zinc-100">{u.nombre}</span>
                  <span className="ml-2 text-slate-500 dark:text-zinc-400">@{u.username}</span>
                  {u.role === "admin" && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">admin</span>
                  )}
                </div>
                {admin && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(u.id)}
                      className="text-sm text-slate-600 underline dark:text-zinc-400"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id, u.nombre)}
                      className="text-sm text-red-600 dark:text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditarUsuarioForm({
  usuario,
  onGuardar,
  onCancelar,
}: {
  usuario: Usuario;
  onGuardar: (data: { nombre?: string; username?: string; password?: string; role?: "user" | "admin" }) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [username, setUsername] = useState(usuario.username);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">(usuario.role);
  return (
    <div className="w-full space-y-2">
      <div>
        <label className="block text-xs text-slate-500 dark:text-zinc-400">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full max-w-xs border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 dark:text-zinc-400">Usuario (login)</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full max-w-xs border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 dark:text-zinc-400">Nueva contraseña (dejar en blanco para no cambiar)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full max-w-xs border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 dark:text-zinc-400">Rol</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "user" | "admin")}
          className="border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        >
          <option value="user">Usuario</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onGuardar({ nombre, username, role, ...(password ? { password } : {}) })}
          className="text-sm text-green-600 dark:text-green-400"
        >
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="text-sm text-slate-600 dark:text-zinc-400">
          Cancelar
        </button>
      </div>
    </div>
  );
}
