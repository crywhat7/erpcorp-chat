"use client";

import { useEffect, useState } from "react";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { Paso } from "@/lib/supabase/types";
import type { Fase } from "@/lib/supabase/types";
import type { Usuario } from "@/lib/supabase/types";

const COLUMNS: { key: Paso["estado"]; label: string }[] = [
  { key: "pendiente", label: "Por hacer" },
  { key: "proceso", label: "En curso" },
  { key: "listo", label: "Finalizado" },
];

const MAX_EN_CURSO = 3;

type PasoConFaseYUsuario = Paso & { fase?: Fase; asignadoUsuario?: Usuario | null };

export default function KanbanPage() {
  const userId = getUserId();
  const [pasos, setPasos] = useState<PasoConFaseYUsuario[]>([]);
  const [fases, setFases] = useState<Fase[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: f } = await supabase
        .schema(SCHEMA_ERP)
        .from("fases")
        .select("id, titulo")
        .order("orden");
      const { data: u } = await supabase
        .schema(SCHEMA_ERP)
        .from("usuarios")
        .select("id, nombre");
      const { data: p } = await supabase
        .schema(SCHEMA_ERP)
        .from("pasos")
        .select("id, fase_id, descripcion, asignado_id, estado, orden")
        .order("orden");
      if (f) setFases(f as Fase[]);
      if (u) setUsuarios(u as Usuario[]);
      if (p && f) {
        const list = (p as Paso[]).map((paso) => ({
          ...paso,
          fase: (f as Fase[]).find((x) => x.id === paso.fase_id),
          asignadoUsuario: (u as Usuario[] | undefined)?.find((x) => x.id === paso.asignado_id) ?? null,
        }));
        setPasos(list);
      }
    })();
  }, []);

  const enCursoDelUsuario = pasos.filter(
    (p) => p.estado === "proceso" && p.asignado_id === userId
  ).length;
  const puedeMoverAEnCurso = enCursoDelUsuario < MAX_EN_CURSO;

  async function moveTo(pasoId: string, nuevoEstado: Paso["estado"]) {
    const paso = pasos.find((p) => p.id === pasoId);
    if (nuevoEstado === "proceso" && userId && paso) {
      const enCurso = pasos.filter((p) => p.estado === "proceso" && p.asignado_id === userId).length;
      const yaEsMioEnCurso = paso.estado === "proceso" && paso.asignado_id === userId;
      const seriaMio = paso.asignado_id === userId || !paso.asignado_id;
      if (seriaMio && !yaEsMioEnCurso && enCurso >= MAX_EN_CURSO) return;
    }
    const updates: { estado: Paso["estado"]; asignado_id?: string | null } = { estado: nuevoEstado };
    if (nuevoEstado === "proceso" && userId && paso && !paso.asignado_id) {
      updates.asignado_id = userId;
    }
    await supabase.schema(SCHEMA_ERP).from("pasos").update(updates).eq("id", pasoId);
    const newAsignadoId = updates.asignado_id ?? paso?.asignado_id ?? null;
    const newAsignadoUsuario = newAsignadoId ? usuarios.find((u) => u.id === newAsignadoId) ?? null : null;
    setPasos((prev) =>
      prev.map((p) =>
        p.id === pasoId
          ? { ...p, estado: nuevoEstado, asignado_id: newAsignadoId, asignadoUsuario: newAsignadoUsuario }
          : p
      )
    );
    setDragging(null);
  }

  function handleDragStart(e: React.DragEvent, pasoId: string) {
    setDragging(pasoId);
    e.dataTransfer.setData("text/plain", pasoId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, colKey: Paso["estado"]) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const paso = pasos.find((p) => p.id === id);
    if (colKey === "proceso" && userId && paso) {
      const enCurso = pasos.filter((p) => p.estado === "proceso" && p.asignado_id === userId).length;
      const yaEsMioEnCurso = paso.estado === "proceso" && paso.asignado_id === userId;
      const seriaMio = paso.asignado_id === userId || !paso.asignado_id;
      if (seriaMio && !yaEsMioEnCurso && enCurso >= MAX_EN_CURSO) return;
    }
    moveTo(id, colKey);
  }

  return (
    <div className="overflow-auto p-6">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-white">Kanban</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-zinc-400">
        Arrastrá tareas entre columnas. Máximo {MAX_EN_CURSO} tareas &quot;En curso&quot; por usuario.
        {userId && (
          <span className="ml-1">
            (Tuyas en curso: {enCursoDelUsuario}/{MAX_EN_CURSO})
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = pasos.filter((p) => p.estado === col.key);
          return (
            <div
              key={col.key}
              className="flex flex-col rounded border border-slate-200 bg-slate-50/50 dark:border-zinc-700 dark:bg-zinc-800/50"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="border-b border-slate-200 px-3 py-2 dark:border-zinc-700">
                <h2 className="font-medium text-black dark:text-white">{col.label}</h2>
                <span className="text-xs text-slate-500 dark:text-zinc-400">{items.length} tareas</span>
              </div>
              <div className="min-h-[200px] flex-1 space-y-2 p-2">
                {items.map((paso) => (
                  <div
                    key={paso.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, paso.id)}
                    className={`cursor-grab border border-slate-200 bg-white p-3 active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-800 ${
                      dragging === paso.id ? "opacity-50" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-black dark:text-zinc-100">
                      {paso.descripcion}
                    </p>
                    {paso.fase && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        {paso.fase.titulo}
                      </p>
                    )}
                    {paso.asignadoUsuario && (
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-zinc-300">
                        {paso.asignadoUsuario.nombre}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
