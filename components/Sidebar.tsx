"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";
import { getSession, clearSession } from "@/lib/auth";
import { useTheme } from "@/components/ThemeProvider";
import Avatar from "@/components/Avatar";
import { useEffect, useState } from "react";
import type { Canal } from "@/lib/supabase/types";

type UnreadMap = Record<string, boolean>;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const session = getSession();
  const [canales, setCanales] = useState<Canal[]>([]);
  const [unreadByCanal, setUnreadByCanal] = useState<UnreadMap>({});
  const currentUserId = session?.userId ?? null;

  useEffect(() => {
    async function fetchCanales() {
      const { data } = await supabase
        .schema(SCHEMA_ERP)
        .from("canales")
        .select("id, nombre, slug")
        .order("nombre");
      if (data) setCanales(data as Canal[]);
    }
    fetchCanales();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("mensajes-new")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: SCHEMA_ERP,
          table: "mensajes",
        },
        (payload) => {
          const canalId = (payload.new as { canal_id: string }).canal_id;
          setUnreadByCanal((prev) => ({ ...prev, [canalId]: true }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  function clearUnread(slug: string) {
    const canal = canales.find((c) => c.slug === slug);
    if (canal) setUnreadByCanal((prev) => ({ ...prev, [canal.id]: false }));
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <nav className="flex flex-col py-2">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-zinc-700">
          <Link
            href="/dashboard/perfil"
            className="flex items-center gap-2 rounded p-1 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Avatar src={session?.userAvatar} alt={session?.userName ?? "Perfil"} size="sm" />
            <span className="truncate text-sm font-medium text-black dark:text-zinc-100">
              {session?.userName ?? "Perfil"}
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
        <div className="mb-2 mt-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          Canales
        </div>
        {canales.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/canal/${c.slug}`}
            onClick={() => clearUnread(c.slug)}
            className={`flex items-center justify-between border-l-2 px-3 py-2 text-sm ${
              pathname === `/dashboard/canal/${c.slug}`
                ? "border-black font-medium text-black dark:border-white dark:text-white"
                : "border-transparent text-black hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            <span># {c.nombre}</span>
            {unreadByCanal[c.id] && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Mensajes nuevos" />
            )}
          </Link>
        ))}
        <Link
          href="/dashboard/canales"
          className={`border-l-2 px-3 py-2 text-sm ${
            pathname === "/dashboard/canales"
              ? "border-black font-medium dark:border-white dark:text-white"
              : "border-transparent text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          Gestionar canales
        </Link>
        <div className="my-2 border-t border-slate-200 dark:border-zinc-700" />
        <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          Secciones
        </div>
        <Link
          href="/dashboard/fases"
          className={`border-l-2 px-3 py-2 text-sm ${
            pathname === "/dashboard/fases"
              ? "border-black font-medium text-black dark:border-white dark:text-white"
              : "border-transparent text-black hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Fases
        </Link>
        <Link
          href="/dashboard/kanban"
          className={`border-l-2 px-3 py-2 text-sm ${
            pathname === "/dashboard/kanban"
              ? "border-black font-medium text-black dark:border-white dark:text-white"
              : "border-transparent text-black hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Kanban
        </Link>
        <Link
          href="/dashboard/recursos"
          className={`border-l-2 px-3 py-2 text-sm ${
            pathname === "/dashboard/recursos"
              ? "border-black font-medium text-black dark:border-white dark:text-white"
              : "border-transparent text-black hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Recursos
        </Link>
        <div className="my-2 border-t border-slate-200 dark:border-zinc-700" />
        <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          Configuración
        </div>
        <Link
          href="/dashboard/usuarios"
          className={`border-l-2 px-3 py-2 text-sm ${
            pathname === "/dashboard/usuarios"
              ? "border-black font-medium dark:border-white dark:text-white"
              : "border-transparent text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          Control de usuarios
        </Link>
        <div className="mt-auto border-t border-slate-200 pt-2 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
            className="w-full px-3 py-2 text-left text-sm text-black hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
    </aside>
  );
}
