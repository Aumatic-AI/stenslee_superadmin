import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface border border-cleo-border rounded-2xl ${className}`}
      {...props}
    />
  );
}
