"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { Recurso } from "@/lib/supabase/types";
import type { Usuario } from "@/lib/supabase/types";

const BUCKET = "recursos_erp";

export default function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = getUserId();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .schema(SCHEMA_ERP)
        .from("usuarios")
        .select("id, nombre");
      if (data) setUsuarios(data as Usuario[]);
    })();
  }, []);

  async function loadRecursos() {
    const { data } = await supabase
      .schema(SCHEMA_ERP)
      .from("recursos")
      .select("id, nombre_archivo, url_bucket, subido_por, created_at")
      .order("created_at", { ascending: false });
    if (data) setRecursos(data as Recurso[]);
  }

  useEffect(() => {
    loadRecursos();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "";
    const name = `${Date.now()}-${file.name}`;
    const { data: upload, error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(name, file, { upsert: false });
    if (uploadErr) {
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(upload.path);
    await supabase.schema(SCHEMA_ERP).from("recursos").insert({
      nombre_archivo: file.name,
      url_bucket: urlData.publicUrl,
      subido_por: userId,
    });
    await loadRecursos();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const getUserName = (id: string | null) =>
    id ? (usuarios.find((u) => u.id === id)?.nombre ?? "—") : "—";

  return (
    <div className="overflow-auto p-4">
      <h1 className="mb-4 text-xl font-semibold text-black dark:text-white">Repositorio de Recursos</h1>
      <div className="mb-4 border border-slate-200 p-3 dark:border-zinc-700">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleUpload}
          disabled={uploading}
          className="text-sm text-black dark:text-zinc-200"
        />
        {uploading && <span className="ml-2 text-slate-500 dark:text-zinc-400">Subiendo…</span>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recursos.map((r) => (
          <li
            key={r.id}
            className="border border-slate-200 p-3 dark:border-zinc-700"
          >
            {/\.(jpg|jpeg|png|gif|webp)$/i.test(r.nombre_archivo) ? (
              <a
                href={r.url_bucket}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={r.url_bucket}
                  alt={r.nombre_archivo}
                  className="mb-2 h-40 w-full border border-slate-200 object-cover dark:border-zinc-600"
                />
              </a>
            ) : null}
            <a
              href={r.url_bucket}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-black underline dark:text-zinc-100"
            >
              {r.nombre_archivo}
            </a>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              {getUserName(r.subido_por)} · {r.created_at ? new Date(r.created_at).toLocaleDateString("es") : ""}
            </p>
          </li>
        ))}
      </ul>
      {recursos.length === 0 && (
        <p className="text-slate-500 dark:text-zinc-400">Aún no hay recursos subidos.</p>
      )}
    </div>
  );
}
