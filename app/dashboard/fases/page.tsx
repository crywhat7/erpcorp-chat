"use client";

import { useEffect, useState } from "react";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { Fase } from "@/lib/supabase/types";
import type { Paso } from "@/lib/supabase/types";
import type { Usuario } from "@/lib/supabase/types";

type PasoConAsignado = Paso & { asignado?: Usuario | null };
type FaseConPasos = Fase & { pasos: PasoConAsignado[]; porcentaje: number };

export default function FasesPage() {
  const [fases, setFases] = useState<FaseConPasos[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nuevaFaseOpen, setNuevaFaseOpen] = useState(false);
  const [editandoFaseId, setEditandoFaseId] = useState<string | null>(null);
  const [editandoPasoId, setEditandoPasoId] = useState<string | null>(null);
  const currentUserId = getUserId();

  async function loadFases() {
    const { data: f } = await supabase
      .schema(SCHEMA_ERP)
      .from("fases")
      .select("id, titulo, orden")
      .order("orden");
    const { data: u } = await supabase
      .schema(SCHEMA_ERP)
      .from("usuarios")
      .select("id, nombre");
    if (u) setUsuarios(u as Usuario[]);
    if (!f || f.length === 0) {
      setFases([]);
      return;
    }
    const fasesData = f as Fase[];
    const { data: pasos } = await supabase
      .schema(SCHEMA_ERP)
      .from("pasos")
      .select("id, fase_id, descripcion, asignado_id, estado, orden")
      .in("fase_id", fasesData.map((x) => x.id))
      .order("orden");
    const pasosList = (pasos ?? []) as Paso[];
    const withUsers = pasosList.map((p) => ({
      ...p,
      asignado: (u as Usuario[] | null)?.find((us) => us.id === p.asignado_id) ?? null,
    }));
    const byFase: Record<string, PasoConAsignado[]> = {};
    for (const fase of fasesData) {
      byFase[fase.id] = withUsers.filter((x) => x.fase_id === fase.id);
    }
    const result: FaseConPasos[] = fasesData.map((fase) => {
      const pasosFase = byFase[fase.id] ?? [];
      const listos = pasosFase.filter((p) => p.estado === "listo").length;
      const total = pasosFase.length;
      const porcentaje = total > 0 ? Math.round((listos / total) * 100) : 0;
      return { ...fase, pasos: pasosFase, porcentaje };
    });
    setFases(result);
  }

  useEffect(() => {
    loadFases();
  }, []);

  async function setEstado(pasoId: string, estado: Paso["estado"]) {
    await supabase.schema(SCHEMA_ERP).from("pasos").update({ estado }).eq("id", pasoId);
    setFases((prev) =>
      prev.map((f) => {
        const newPasos = f.pasos.map((p) => (p.id === pasoId ? { ...p, estado } : p));
        const listos = newPasos.filter((p) => p.estado === "listo").length;
        const total = newPasos.length;
        const porcentaje = total > 0 ? Math.round((listos / total) * 100) : 0;
        return { ...f, pasos: newPasos, porcentaje };
      })
    );
  }

  async function setAsignado(pasoId: string, usuarioId: string | null) {
    await supabase.schema(SCHEMA_ERP).from("pasos").update({ asignado_id: usuarioId }).eq("id", pasoId);
    const user = usuarios.find((u) => u.id === usuarioId) ?? null;
    setFases((prev) =>
      prev.map((f) => ({
        ...f,
        pasos: f.pasos.map((p) =>
          p.id === pasoId ? { ...p, asignado_id: usuarioId, asignado: user } : p
        ),
      }))
    );
  }

  async function setTareaActual(tarea: string) {
    if (!currentUserId) return;
    await supabase
      .schema(SCHEMA_ERP)
      .from("usuarios")
      .update({
        tarea_actual: tarea || null,
        tarea_inicio: tarea ? new Date().toISOString() : null,
      })
      .eq("id", currentUserId);
  }

  async function crearFase(titulo: string, orden: number) {
    await supabase.schema(SCHEMA_ERP).from("fases").insert({ titulo: titulo.trim(), orden });
    setNuevaFaseOpen(false);
    loadFases();
  }

  async function actualizarFase(id: string, titulo: string, orden: number) {
    await supabase.schema(SCHEMA_ERP).from("fases").update({ titulo: titulo.trim(), orden }).eq("id", id);
    setEditandoFaseId(null);
    loadFases();
  }

  async function eliminarFase(id: string, titulo: string) {
    if (!confirm(`¿Eliminar la fase "${titulo}"? Se borrarán todas sus tareas.`)) return;
    await supabase.schema(SCHEMA_ERP).from("fases").delete().eq("id", id);
    setEditandoFaseId(null);
    loadFases();
  }

  async function agregarTarea(faseId: string, descripcion: string) {
    const fase = fases.find((f) => f.id === faseId);
    const maxOrden = fase?.pasos.length ?? 0;
    await supabase.schema(SCHEMA_ERP).from("pasos").insert({
      fase_id: faseId,
      descripcion: descripcion.trim(),
      estado: "pendiente",
      orden: maxOrden,
    });
    loadFases();
  }

  async function actualizarPaso(pasoId: string, descripcion: string) {
    await supabase.schema(SCHEMA_ERP).from("pasos").update({ descripcion: descripcion.trim() }).eq("id", pasoId);
    setEditandoPasoId(null);
    setFases((prev) =>
      prev.map((f) => ({
        ...f,
        pasos: f.pasos.map((p) => (p.id === pasoId ? { ...p, descripcion: descripcion.trim() } : p)),
      }))
    );
  }

  async function eliminarPaso(pasoId: string, desc: string) {
    if (!confirm(`¿Eliminar la tarea "${desc}"?`)) return;
    await supabase.schema(SCHEMA_ERP).from("pasos").delete().eq("id", pasoId);
    setEditandoPasoId(null);
    loadFases();
  }

  return (
    <div className="overflow-auto p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-black dark:text-white">Fases del proyecto</h1>
        <button
          type="button"
          onClick={() => setNuevaFaseOpen(true)}
          className="border border-black bg-black px-4 py-2 text-sm font-medium text-white dark:border-white dark:bg-white dark:text-black"
        >
          + Nueva fase
        </button>
      </div>

      {nuevaFaseOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const titulo = (form.querySelector('[name="titulo"]') as HTMLInputElement).value;
            const orden = parseInt((form.querySelector('[name="orden"]') as HTMLInputElement).value || "0", 10);
            if (titulo.trim()) crearFase(titulo, orden);
          }}
          className="mb-6 border border-slate-200 p-4 dark:border-zinc-700"
        >
          <h2 className="mb-3 text-sm font-medium text-black dark:text-white">Nueva fase</h2>
          <div className="flex flex-wrap gap-2">
            <input
              name="titulo"
              type="text"
              required
              placeholder="Título de la fase"
              className="min-w-[200px] border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <input
              name="orden"
              type="number"
              min={0}
              defaultValue={fases.length}
              placeholder="Orden"
              className="w-20 border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <button type="submit" className="border border-black bg-black px-3 py-2 text-sm text-white dark:border-white dark:bg-white dark:text-black">
              Crear
            </button>
            <button type="button" onClick={() => setNuevaFaseOpen(false)} className="border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:text-zinc-200">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {fases.length === 0 && !nuevaFaseOpen && (
          <p className="text-slate-500 dark:text-zinc-400">No hay fases. Creá una con &quot;Nueva fase&quot;.</p>
        )}
        {fases.map((fase) => (
          <section
            key={fase.id}
            className="border border-slate-200 dark:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
              {editandoFaseId === fase.id ? (
                <EditarFaseForm
                  fase={fase}
                  onGuardar={(titulo, orden) => actualizarFase(fase.id, titulo, orden)}
                  onCancelar={() => setEditandoFaseId(null)}
                />
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-medium text-black dark:text-white">{fase.titulo}</h2>
                    <span className="text-sm text-slate-600 dark:text-zinc-400">Orden: {fase.orden}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditandoFaseId(fase.id)}
                        className="text-sm text-slate-600 underline dark:text-zinc-400"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarFase(fase.id, fase.titulo)}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 dark:text-zinc-400">{fase.porcentaje}%</span>
                    <div className="h-2 w-32 overflow-hidden border border-slate-200 bg-slate-200 dark:border-zinc-600 dark:bg-zinc-700">
                      <div
                        className="h-full bg-black dark:bg-white"
                        style={{ width: `${fase.porcentaje}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-zinc-700">
              {fase.pasos.map((paso) => (
                <li key={paso.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  {editandoPasoId === paso.id ? (
                    <EditarPasoForm
                      paso={paso}
                      onGuardar={(desc) => actualizarPaso(paso.id, desc)}
                      onCancelar={() => setEditandoPasoId(null)}
                    />
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-black dark:text-zinc-100">{paso.descripcion}</p>
                        {paso.asignado && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                            Asignado: {paso.asignado.nombre}
                          </p>
                        )}
                      </div>
                      <select
                        value={paso.asignado_id ?? ""}
                        onChange={(e) => setAsignado(paso.id, e.target.value || null)}
                        className="border border-slate-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                      >
                        <option value="">Sin asignar</option>
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={paso.estado}
                        onChange={(e) => setEstado(paso.id, e.target.value as Paso["estado"])}
                        className="border border-slate-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="proceso">En proceso</option>
                        <option value="listo">Listo</option>
                      </select>
                      {currentUserId && (
                        <button
                          type="button"
                          onClick={() => setTareaActual(paso.descripcion)}
                          className="border border-slate-200 px-2 py-1 text-xs dark:border-zinc-600 dark:text-zinc-300"
                        >
                          Estoy en esto
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditandoPasoId(paso.id)}
                        className="text-sm text-slate-600 dark:text-zinc-400"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarPaso(paso.id, paso.descripcion)}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </li>
              ))}
              <li className="px-4 py-3">
                <AgregarTareaForm onAgregar={(desc) => agregarTarea(fase.id, desc)} />
              </li>
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function EditarFaseForm({
  fase,
  onGuardar,
  onCancelar,
}: {
  fase: Fase;
  onGuardar: (titulo: string, orden: number) => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(fase.titulo);
  const [orden, setOrden] = useState(fase.orden);
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="min-w-[200px] border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      />
      <input
        type="number"
        value={orden}
        onChange={(e) => setOrden(parseInt(e.target.value, 10) || 0)}
        className="w-16 border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      />
      <button type="button" onClick={() => onGuardar(titulo, orden)} className="text-sm text-green-600 dark:text-green-400">
        Guardar
      </button>
      <button type="button" onClick={onCancelar} className="text-sm text-slate-600 dark:text-zinc-400">
        Cancelar
      </button>
    </div>
  );
}

function EditarPasoForm({
  paso,
  onGuardar,
  onCancelar,
}: {
  paso: PasoConAsignado;
  onGuardar: (desc: string) => void;
  onCancelar: () => void;
}) {
  const [desc, setDesc] = useState(paso.descripcion);
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="min-w-[200px] flex-1 border border-slate-200 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      />
      <button type="button" onClick={() => onGuardar(desc)} className="text-sm text-green-600 dark:text-green-400">
        Guardar
      </button>
      <button type="button" onClick={onCancelar} className="text-sm text-slate-600 dark:text-zinc-400">
        Cancelar
      </button>
    </div>
  );
}

function AgregarTareaForm({ onAgregar }: { onAgregar: (desc: string) => void }) {
  const [desc, setDesc] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (desc.trim()) {
          onAgregar(desc);
          setDesc("");
        }
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Nueva tarea…"
        className="flex-1 border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      />
      <button
        type="submit"
        className="border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:text-zinc-200"
      >
        Agregar
      </button>
    </form>
  );
}
