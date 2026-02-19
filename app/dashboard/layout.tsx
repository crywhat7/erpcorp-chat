"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import BannerRealtime from "@/components/BannerRealtime";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (getSession() === null) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-900">
      <BannerRealtime />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 border-t border-slate-200 md:border-t-0 dark:border-zinc-700">
          {children}
        </main>
      </div>
    </div>
  );
}
