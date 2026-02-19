"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, SCHEMA_ERP } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: canales } = await supabase
        .schema(SCHEMA_ERP)
        .from("canales")
        .select("slug")
        .order("nombre")
        .limit(1);
      const slug = (canales?.[0] as { slug: string } | undefined)?.slug ?? "general";
      router.replace(`/dashboard/canal/${slug}`);
    })();
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center border-b border-slate-200">
      <p className="text-black">Cargando canal…</p>
    </div>
  );
}
