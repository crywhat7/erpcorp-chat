"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getSession, getUserId, updateSessionAvatar, updateSessionProfile } from "@/lib/auth";
import Avatar from "@/components/Avatar";

const BUCKET_AVATAR = "avatares";

export default function PerfilPage() {
  const router = useRouter();
  const session = getSession();
  const userId = getUserId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!session) return;
    setNombre(session.userName);
    setUsername("");
    setAvatarUrl(session.userAvatar);
    (async () => {
      if (!userId) return;
      const { data } = await supabase
        .schema(SCHEMA_ERP)
        .from("usuarios")
        .select("nombre, username, avatar_url")
        .eq("id", userId)
        .single();
      if (data) {
        setNombre((data as { nombre: string }).nombre);
        setUsername((data as { username: string }).username);
        setAvatarUrl((data as { avatar_url: string | null }).avatar_url);
      }
    })();
  }, [session, userId]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_AVATAR).upload(path, file, { upsert: true });
    if (error) {
      setMessage({ type: "error", text: "Error al subir la foto." });
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET_AVATAR).getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase
      .schema(SCHEMA_ERP)
      .from("usuarios")
      .update({ avatar_url: url })
      .eq("id", userId);
    setAvatarUrl(url);
    updateSessionAvatar(url);
    setMessage({ type: "ok", text: "Foto actualizada." });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    const updates: { nombre?: string; username?: string; password?: string } = { nombre };
    if (username.trim()) updates.username = username.trim();
    if (password.trim()) updates.password = password.trim();
    const { error } = await supabase
      .schema(SCHEMA_ERP)
      .from("usuarios")
      .update(updates)
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: error.message || "Error al guardar." });
      return;
    }
    updateSessionProfile(nombre);
    setPassword("");
    setMessage({ type: "ok", text: "Perfil actualizado." });
  }

  if (!session) return null;

  return (
    <div className="overflow-auto p-6">
      <h1 className="mb-6 text-xl font-semibold text-black dark:text-white">Mi perfil</h1>
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4 border border-slate-200 p-6 dark:border-zinc-700">
          <Avatar src={avatarUrl} alt={nombre} size="lg" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="text-sm text-black dark:text-zinc-200"
          />
          <span className="text-xs text-slate-500 dark:text-zinc-400">Foto de perfil</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 border border-slate-200 p-6 dark:border-zinc-700">
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-zinc-200">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-slate-200 bg-white px-3 py-2 text-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-zinc-200">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Dejar en blanco para no cambiar"
              className="w-full border border-slate-200 bg-white px-3 py-2 text-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-zinc-200">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar en blanco para no cambiar"
              className="w-full border border-slate-200 bg-white px-3 py-2 text-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          {message && (
            <p className={message.type === "ok" ? "text-sm text-green-600 dark:text-green-400" : "text-sm text-red-600 dark:text-red-400"}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full border border-black bg-black py-2 text-sm font-medium text-white disabled:opacity-60 dark:border-white dark:bg-white dark:text-black"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
