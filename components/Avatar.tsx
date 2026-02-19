"use client";

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };

export default function Avatar({ src, alt = "", className = "", size = "md" }: Props) {
  return (
    <span
      className={`inline-block overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-zinc-600 dark:bg-zinc-700 ${sizes[size]} ${className}`}
    >
      <img
        src={src || FALLBACK}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
