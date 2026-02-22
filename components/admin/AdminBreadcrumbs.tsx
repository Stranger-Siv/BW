"use client";

import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AdminBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function AdminBreadcrumbs({ items, className = "" }: AdminBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex min-h-[44px] flex-wrap items-center gap-x-2 gap-y-1 text-sm ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {i > 0 && (
              <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                /
              </span>
            )}
            {isLast || !item.href ? (
              <span className="truncate max-w-[12rem] sm:max-w-[20rem] text-slate-600 dark:text-slate-300">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="truncate max-w-[12rem] sm:max-w-[20rem] font-medium text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
