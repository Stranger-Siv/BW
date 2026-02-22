import { SITE } from "@/lib/site";

export function Footer() {
  const { developedBy, developedByUrl } = SITE;
  return (
    <footer className="mt-auto border-t border-white/5 px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-center gap-1 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Developed by{" "}
          {developedByUrl ? (
            <a
              href={developedByUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              {developedBy}
            </a>
          ) : (
            <span className="font-medium text-slate-400 dark:text-slate-400">{developedBy}</span>
          )}
        </p>
      </div>
    </footer>
  );
}
