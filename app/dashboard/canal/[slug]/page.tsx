"use client";

import { useParams } from "next/navigation";
import ChatRealtime from "@/components/ChatRealtime";

export default function CanalPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col border-b border-slate-200 md:h-[calc(100vh-4rem)]">
      <ChatRealtime canalSlug={slug} />
    </div>
  );
}
