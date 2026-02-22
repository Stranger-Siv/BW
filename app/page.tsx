"use client";

import Link from "next/link";
import { SITE } from "@/lib/site";
import { FadeInUp, StaggerChildren, StaggerItem } from "@/components/ui/animations";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-12 lg:py-16">
        {/* Hero */}
        <section className="relative mb-12 px-4 py-8 text-center sm:px-6 sm:py-10 md:mb-20 md:px-10 md:py-16 lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden opacity-60">
            <div className="h-[400px] w-[600px] rounded-full bg-emerald-500/20 blur-[120px]" aria-hidden />
          </div>
          <FadeInUp className="relative">
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90 sm:text-base">
              {SITE.name} · {SITE.serverName}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Compete. Dominate. Win.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-400 sm:mt-4 sm:text-lg md:text-xl">
              Welcome to the ultimate BedWars arena. Register your team and battle in competitive tournaments — Solo, Duo, or Squad. Defend your bed. Break theirs. Claim your victory.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4">
              <Link
                href="/tournaments"
                className="btn-gradient inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-5 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Register Now
              </Link>
              <Link
                href="/tournaments"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-200 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 min-h-[44px] inline-flex items-center justify-center"
              >
                View Tournaments
              </Link>
              <a
                href={SITE.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-200 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 min-h-[44px] inline-flex items-center justify-center"
              >
                Join Discord
              </a>
            </div>
          </FadeInUp>
        </section>

        {/* Hosted by Baba Tillu */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <div className="card-glass flex flex-col items-center gap-4 p-6 sm:flex-row sm:gap-6 sm:p-8">
            <img
              src={SITE.hostedByLogo}
              alt=""
              className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-white/10 sm:h-28 sm:w-28"
            />
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Hosted &amp; sponsored by {SITE.hostedBy}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                This isn’t just a server — it’s a battlefield where strategy meets skill. Whether you’re learning the grind or chasing perfection, this is your place to grow, team up, and conquer.
              </p>
            </div>
          </div>
          </FadeInUp>
        </section>

        {/* What Awaits You */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <h2 className="mb-4 text-xl font-semibold text-white sm:mb-6 sm:text-2xl md:text-3xl">
            What Awaits You
          </h2>
          <StaggerChildren className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              { label: "Active matches & custom events", icon: "🎮" },
              { label: "Competitive tournaments & rewards", icon: "🏆" },
              { label: "Friendly but competitive community", icon: "🤝" },
              { label: "Fair play & supportive staff", icon: "🛡️" },
            ].map((item) => (
              <StaggerItem
                key={item.label}
                className="card-glass flex items-center gap-3 p-4 sm:p-4 transition-shadow duration-300 hover:shadow-lg"
              >
                <span className="text-2xl" aria-hidden>{item.icon}</span>
                <span className="text-sm font-medium text-slate-200 sm:text-base">{item.label}</span>
              </StaggerItem>
            ))}
          </StaggerChildren>
          </FadeInUp>
        </section>

        {/* Server & where to play */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <div className="card-glass p-4 sm:p-6 md:p-8">
            <h2 className="mb-3 text-xl font-semibold text-white sm:mb-4 sm:text-2xl">
              Where we play
            </h2>
            <p className="text-slate-400">
              All BedWars tournament matches are hosted on <strong className="text-slate-200">{SITE.serverName}</strong>. Join the server to compete and practise.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-lg font-mono text-emerald-400">
                {SITE.serverIp}
              </code>
              <span className="text-sm text-slate-500">Minecraft Java · As supported by server</span>
            </div>
          </div>
          </FadeInUp>
        </section>

        {/* What is Bedwars */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <div className="card-glass p-4 sm:p-6 md:p-8 lg:p-10">
            <h2 className="mb-4 text-2xl font-semibold text-white md:text-3xl">
              What is Bedwars?
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Bedwars is a team-based PvP game where you defend your bed, gather resources, and eliminate opponents. 
              Our tournaments run competitive matches with clear brackets: register your team, play your rounds, and advance to the top. 
              All events are organized with scheduled rounds, admin-managed brackets, and live slot tracking so you know exactly when and who you’re facing.
            </p>
          </div>
          </FadeInUp>
        </section>

        {/* Tournament formats */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <h2 className="mb-4 text-xl font-semibold text-white sm:mb-6 sm:text-2xl md:text-3xl">
            Tournament formats
          </h2>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
            {[
              { title: "Solo", players: 1, desc: "Every player for themselves. Register with your IGN and fight alone for the crown.", icon: "⚔️" },
              { title: "Duo", players: 2, desc: "Team up with one partner. Coordinate strategies and share the victory.", icon: "👥" },
              { title: "Squad", players: 4, desc: "Full team of four. Build your roster, assign roles, and dominate as a unit.", icon: "🛡️" },
            ].map((item, i) => (
              <div
                key={item.title}
                className="card-glass animate-fade-in p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
                style={{ animationDelay: `${(i + 1) * 0.1}s` }}
              >
                <span className="text-2xl sm:text-3xl" aria-hidden>{item.icon}</span>
                <h3 className="mt-2 text-lg font-semibold text-white sm:mt-3 sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs font-medium text-emerald-400">
                  {item.players} player{item.players !== 1 ? "s" : ""} per team
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <div className="card-glass p-4 sm:p-6 md:p-8 lg:p-10">
            <h2 className="mb-4 text-xl font-semibold text-white sm:mb-6 sm:text-2xl md:text-3xl">
              How it works
            </h2>
            <ol className="space-y-4 text-slate-400">
              <li className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">1</span>
                <span><strong className="text-slate-200">Sign in with Google</strong> and complete your profile (display name, Minecraft IGN, Discord).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">2</span>
                <span><strong className="text-slate-200">Pick a tournament</strong> from the open events. Choose Solo, Duo, or Squad and check the registration deadline.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">3</span>
                <span><strong className="text-slate-200">Register</strong> — fill in your entry or team details (Solo, Duo, or Squad) in one form.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">4</span>
                <span><strong className="text-slate-200">Play your rounds</strong> when the bracket is published. View rounds and matchups from the tournament page.</span>
              </li>
            </ol>
          </div>
          </FadeInUp>
        </section>

        {/* Feature cards */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <StaggerChildren className="grid gap-4 sm:gap-6 sm:grid-cols-3">
          {[
            {
              title: "Structured Tournament System",
              desc: "Clear brackets, schedules, and rules for every event.",
              icon: "🏆",
            },
            {
              title: "Live Slot Tracking",
              desc: "See remaining spots and registration deadlines in real time.",
              icon: "📊",
            },
            {
              title: "Admin Controlled Brackets",
              desc: "Organizers manage rounds and advancement with full control.",
              icon: "🎮",
            },
          ].map((item) => (
            <StaggerItem
              key={item.title}
              className="card-glass p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
            >
              <span className="text-2xl sm:text-3xl" aria-hidden>{item.icon}</span>
              <h3 className="mt-2 text-lg font-semibold text-white sm:mt-3 sm:text-xl">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm text-slate-400 sm:mt-2">
                {item.desc}
              </p>
            </StaggerItem>
          ))}
          </StaggerChildren>
        </section>

        {/* Tournament rules */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <div className="card-glass p-4 sm:p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
              Tournament rules
            </h2>
            <ul className="space-y-2 text-slate-400">
              <li className="flex gap-2"><span className="text-red-400">No</span> hacks, mods, macros, auto-clickers, or unfair advantages</li>
              <li className="flex gap-2"><span className="text-red-400">No</span> glitch abusing or stream sniping</li>
              <li>Only allowed clients/mods as per {SITE.serverName} rules</li>
              <li>Team members must remain the same throughout the tournament</li>
              <li>Respect all players and staff — toxicity or abuse is not tolerated</li>
              <li>Be on time for matches; only registered players are allowed</li>
              <li>Admin and staff decisions are final</li>
            </ul>
            <p className="mt-4 text-sm font-medium text-amber-400/90">
              Rule break = immediate disqualification
            </p>
          </div>
          </FadeInUp>
        </section>

        {/* Winner prizes */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <div className="card-glass p-4 sm:p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
              Winner prizes
            </h2>
            <p className="mb-3 text-slate-400">
              Prizes are awarded to the <strong className="text-slate-200">winning team as a whole</strong>, not per player.
            </p>
            <ul className="space-y-2 text-slate-300">
              <li>🥇 Special rank</li>
              <li>🏷️ Exclusive winner tag</li>
              <li>🎁 Giveaway rewards</li>
              <li>💰 <strong>$10 {SITE.serverName} Gift Card</strong> or <strong>Minecraft Premium Account</strong> (choose one)</li>
              <li>👑 Special winner role on Discord for 1 week</li>
            </ul>
          </div>
          </FadeInUp>
        </section>

        {/* Requirements */}
        <section className="mb-10 sm:mb-16 md:mb-20">
          <FadeInUp>
          <div className="card-glass p-4 sm:p-6 md:p-8 lg:p-10">
            <h2 className="mb-3 text-xl font-semibold text-white sm:mb-4 sm:text-2xl md:text-3xl">
              Requirements
            </h2>
            <ul className="list-inside space-y-2 text-slate-400">
              <li>Team must have the required size (Solo 1, Duo 2, Squad 4)</li>
              <li>All players must join the official Discord: <a href={SITE.discordUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-400 hover:text-emerald-300">Join here</a></li>
              <li>Subscribe to {SITE.hostedBy} on YouTube</li>
              <li>Matches are hosted on {SITE.serverName} — <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-400">{SITE.serverIp}</code></li>
              <li>Minecraft Java Edition and a valid in-game name (IGN)</li>
              <li>Google account to sign in and register on this site</li>
              <li>For Duo/Squad: the captain fills in all players’ Minecraft IGN and Discord</li>
            </ul>
            <p className="mt-6 text-sm text-slate-500">
              Each tournament has a limited number of slots and a registration deadline. Once your team is complete and registered, you’ll see rounds and matchups when the organizer publishes them.
            </p>
          </div>
          </FadeInUp>
        </section>

        {/* CTA */}
        <section className="text-center pb-6 sm:pb-0">
          <FadeInUp delay={0.1}>
          <p className="mb-4 text-slate-400 sm:mb-6">
            Ready to compete? Join Discord for updates and registrations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tournaments"
              className="btn-gradient inline-flex min-h-[44px] items-center justify-center px-5 py-3"
            >
              View open tournaments
            </Link>
            <a
              href={SITE.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-200 transition hover:bg-white/10 min-h-[44px] inline-flex items-center justify-center"
            >
              Join Discord
            </a>
          </div>
          </FadeInUp>
        </section>
      </div>
    </main>
  );
}
