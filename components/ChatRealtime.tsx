"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { Mensaje } from "@/lib/supabase/types";
import type { Canal } from "@/lib/supabase/types";

type MensajeConUsuario = Mensaje & { usuarios?: { nombre: string } | null };

export default function ChatRealtime({ canalSlug }: { canalSlug: string }) {
  const [canal, setCanal] = useState<Canal | null>(null);
  const [mensajes, setMensajes] = useState<MensajeConUsuario[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const userId = getUserId();

  useEffect(() => {
    (async () => {
      const { data: canalData } = await supabase
        .schema(SCHEMA_ERP)
        .from("canales")
        .select("id, nombre, slug")
        .eq("slug", canalSlug)
        .single();
      if (!canalData) {
        setLoading(false);
        return;
      }
      setCanal(canalData as Canal);
      const canalId = (canalData as Canal).id;

      const { data: msgs } = await supabase
        .schema(SCHEMA_ERP)
        .from("mensajes")
        .select("id, canal_id, usuario_id, texto, creado_at")
        .eq("canal_id", canalId)
        .order("creado_at", { ascending: true });
      const withUsers = await Promise.all(
        (msgs || []).map(async (m) => {
          const { data: u } = await supabase
            .schema(SCHEMA_ERP)
            .from("usuarios")
            .select("nombre")
            .eq("id", m.usuario_id)
            .single();
          return { ...m, usuarios: u } as MensajeConUsuario;
        })
      );
      setMensajes(withUsers);
      setLoading(false);
    })();
  }, [canalSlug]);

  useEffect(() => {
    if (!canal) return;
    const channel = supabase
      .channel(`mensajes-${canal.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: SCHEMA_ERP,
          table: "mensajes",
          filter: `canal_id=eq.${canal.id}`,
        },
        async (payload) => {
          const newRow = payload.new as Mensaje;
          const { data: u } = await supabase
            .schema(SCHEMA_ERP)
            .from("usuarios")
            .select("nombre")
            .eq("id", newRow.usuario_id)
            .single();
          setMensajes((prev) => [
            ...prev,
            { ...newRow, usuarios: u } as MensajeConUsuario,
          ]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canal]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [mensajes]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!canal || !userId || !texto.trim()) return;
    await supabase.schema(SCHEMA_ERP).from("mensajes").insert({
      canal_id: canal.id,
      usuario_id: userId,
      texto: texto.trim(),
    });
    setTexto("");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center border-b border-slate-200 dark:border-zinc-700">
        <p className="text-slate-500 dark:text-zinc-400">Cargando canal…</p>
      </div>
    );
  }
  if (!canal) {
    return (
      <div className="flex flex-1 items-center justify-center border-b border-slate-200 dark:border-zinc-700">
        <p className="text-slate-500 dark:text-zinc-400">Canal no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-2 dark:border-zinc-700">
        <h2 className="text-lg font-semibold text-black dark:text-white"># {canal.nombre}</h2>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {mensajes.length === 0 ? (
          <p className="text-slate-500 dark:text-zinc-400">Sin mensajes. Escribe el primero.</p>
        ) : (
          <ul className="space-y-2">
            {mensajes.map((m) => (
              <li key={m.id} className="border-b border-slate-100 pb-2 last:border-0 dark:border-zinc-700">
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {m.usuarios?.nombre ?? "?"} · {new Date(m.creado_at).toLocaleString("es")}
                </span>
                <p className="mt-0.5 text-black dark:text-zinc-100">{m.texto}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={enviar} className="border-t border-slate-200 p-3 dark:border-zinc-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje…"
            className="flex-1 border border-slate-200 px-3 py-2 text-black placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
          <button
            type="submit"
            className="border border-black bg-black px-4 py-2 text-sm font-medium text-white dark:border-white dark:bg-white dark:text-black"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
