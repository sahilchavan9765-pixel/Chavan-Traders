import React from "react";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl bg-stone-200/80 dark:bg-stone-800/80 motion-safe:animate-pulse ${className}`}
      {...props}
    />
  );
}

