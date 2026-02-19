"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth";
import type { Canal } from "@/lib/supabase/types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CanalesPage() {
  const admin = isAdmin();
  const [canales, setCanales] = useState<Canal[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCanales();
  }, []);

  async function loadCanales() {
    const { data } = await supabase
      .schema(SCHEMA_ERP)
      .from("canales")
      .select("id, nombre, slug")
      .order("nombre");
    if (data) setCanales(data as Canal[]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nombre = formNombre.trim();
    const slug = formSlug.trim() || slugify(nombre);
    if (!nombre) {
      setError("El nombre es obligatorio.");
      return;
    }
    const { error: err } = await supabase
      .schema(SCHEMA_ERP)
      .from("canales")
      .insert({ nombre, slug });
    if (err) {
      setError(err.message || "Error al crear.");
      return;
    }
    setFormNombre("");
    setFormSlug("");
    setCreateOpen(false);
    loadCanales();
  }

  async function handleUpdate(id: string, nombre: string, slug: string) {
    setError("");
    const { error: err } = await supabase
      .schema(SCHEMA_ERP)
      .from("canales")
      .update({ nombre: nombre.trim(), slug: slug.trim() })
      .eq("id", id);
    if (err) {
      setError(err.message || "Error al guardar.");
      return;
    }
    setEditing(null);
    loadCanales();
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el canal "${nombre}"? Se borrarán todos los mensajes.`)) return;
    await supabase.schema(SCHEMA_ERP).from("canales").delete().eq("id", id);
    loadCanales();
  }

  return (
    <div className="overflow-auto p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-black dark:text-white">Canales</h1>
        {admin ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border border-black bg-black px-4 py-2 text-sm font-medium text-white dark:border-white dark:bg-white dark:text-black"
          >
            + Nuevo canal
          </button>
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Solo los administradores pueden crear, editar o eliminar canales.
          </p>
        )}
      </div>

      {!admin && (
        <div className="mb-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Para gestionar canales (crear, editar, eliminar) tenés que iniciar sesión como administrador.
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {admin && createOpen && (
        <form
          onSubmit={handleCreate}
          className="mb-6 border border-slate-200 p-4 dark:border-zinc-700"
        >
          <h2 className="mb-3 text-sm font-medium text-black dark:text-white">Crear canal</h2>
          <div className="mb-2">
            <label className="mb-1 block text-xs text-slate-500 dark:text-zinc-400">Nombre</label>
            <input
              type="text"
              value={formNombre}
              onChange={(e) => {
                setFormNombre(e.target.value);
                if (!formSlug || formSlug === slugify(formNombre)) setFormSlug(slugify(e.target.value));
              }}
              placeholder="Ej: General"
              className="w-full border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-slate-500 dark:text-zinc-400">Slug (URL del canal)</label>
            <input
              type="text"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="Ej: general"
              className="w-full border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
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
        {canales.length === 0 && (
          <li className="border border-slate-200 p-4 text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
            No hay canales. {admin ? "Creá uno con el botón \"Nuevo canal\"." : "Un administrador puede crear canales."}
          </li>
        )}
        {canales.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 p-3 dark:border-zinc-700"
          >
            {editing === c.id && admin ? (
              <EditCanalForm
                canal={c}
                onGuardar={(nombre, slug) => handleUpdate(c.id, nombre, slug)}
                onCancelar={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/canal/${c.slug}`}
                    className="font-medium text-black hover:underline dark:text-zinc-100"
                  >
                    # {c.nombre}
                  </Link>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">/{c.slug}</span>
                </div>
                {admin && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(c.id)}
                      className="text-sm text-slate-600 underline dark:text-zinc-400"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.nombre)}
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

function EditCanalForm({
  canal,
  onGuardar,
  onCancelar,
}: {
  canal: Canal;
  onGuardar: (nombre: string, slug: string) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(canal.nombre);
  const [slug, setSlug] = useState(canal.slug);
  return (
    <div className="w-full space-y-2">
      <label className="block text-xs text-slate-500 dark:text-zinc-400">Nombre</label>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-full max-w-xs border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      />
      <label className="block text-xs text-slate-500 dark:text-zinc-400">Slug (URL)</label>
      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="w-full max-w-xs border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      />
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => onGuardar(nombre.trim(), slug.trim())} className="text-sm text-green-600 dark:text-green-400">
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="text-sm text-slate-600 dark:text-zinc-400">
          Cancelar
        </button>
      </div>
    </div>
  );
}
