"use client";

import { useEffect, useState } from "react";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getTimeAgo } from "@/lib/time-ago";
import type { Usuario } from "@/lib/supabase/types";

export default function BannerRealtime() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    async function fetchUsuarios() {
      const { data } = await supabase
        .schema(SCHEMA_ERP)
        .from("usuarios")
        .select("id, nombre, tarea_actual, tarea_inicio")
        .order("nombre");
      if (data) setUsuarios(data as Usuario[]);
    }
    fetchUsuarios();

    const channel = supabase
      .channel("usuarios-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: SCHEMA_ERP,
          table: "usuarios",
        },
        () => fetchUsuarios()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm text-black dark:text-zinc-100">
        {usuarios.length === 0 ? (
          <span className="text-slate-500 dark:text-zinc-400">Cargando equipo…</span>
        ) : (
          usuarios.map((u) => (
            <span key={u.id}>
              <strong>{u.nombre}</strong>
              {u.tarea_actual ? (
                <>: Trabajando en {u.tarea_actual} {getTimeAgo(u.tarea_inicio)}</>
              ) : (
                ": Sin tarea asignada"
              )}
            </span>
          ))
        )}
      </div>
    </header>
  );
}
