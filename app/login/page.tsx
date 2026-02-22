"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Suspense } from "react";
import { SITE } from "@/lib/site";
import { FadeInUp } from "@/components/ui/animations";

function LoginForm() {
  return (
    <main className="page py-10 sm:py-16">
      <div className="page-inner-form">
        <FadeInUp className="mb-8 text-center sm:mb-10">
          <img
            src={SITE.hostedByLogo}
            alt=""
            className="mx-auto h-16 w-16 rounded-2xl object-cover ring-2 ring-white/10 sm:h-20 sm:w-20"
          />
          <h1 className="page-title mt-4 text-white sm:text-4xl">
            Sign in to {SITE.name}
          </h1>
          <p className="page-subtitle mt-2 text-slate-400">
            Use your Google account to register for BedWars tournaments on {SITE.serverName} and manage your teams.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sponsored by <strong className="text-slate-400">{SITE.hostedBy}</strong> · <a href={SITE.discordUrl} target="_blank" rel="noopener noreferrer" className="back-link">Join Discord</a> for rules &amp; updates
          </p>
        </FadeInUp>

        <FadeInUp delay={0.08}>
        <div className="card-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Sign in with Google
          </h2>
          <p className="mb-6 text-sm text-slate-400">
            We use Google so you don’t need a separate password. Your email and name are used only to identify you and link your tournament registrations.
          </p>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
            className="btn-gradient flex w-full min-h-[48px] items-center justify-center gap-3 py-3"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
        </FadeInUp>

        <FadeInUp delay={0.12}>
        <div className="card mt-6">
          <h3 className="mb-3 text-base font-semibold text-white">
            What happens next
          </h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-emerald-400 font-medium shrink-0">1.</span>
              <span>You’ll complete a short profile (display name, Minecraft IGN, Discord) so teams can find you.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-medium shrink-0">2.</span>
              <span>Browse open tournaments and register solo or with a team (Duo/Squad).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-medium shrink-0">3.</span>
              <span>View your matches when brackets are published.</span>
            </li>
          </ol>
        </div>
        </FadeInUp>

        <FadeInUp delay={0.16}>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-500">
          <p>
            We only use your Google account to sign you in. We don’t post to your account or access your data outside of what’s needed for the tournament platform.
          </p>
        </div>
        </FadeInUp>

        <p className="mt-8 text-center text-sm text-slate-400">
          <Link href="/" className="back-link">← Back to home</Link>
          {" · "}
          <a href={SITE.discordUrl} target="_blank" rel="noopener noreferrer" className="back-link">
            Join Discord
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="loading-wrap"><p className="loading-text">Loading…</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
