import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { OnboardingGate } from "@/components/OnboardingGate";

export const metadata: Metadata = {
  title: "BedWars Tournament · MCFleet",
  description: "Register for BedWars tournaments on MCFleet. Defend your bed, break theirs, claim victory. Sponsored by Baba Tillu. play.mcfleet.net",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-gradient-gaming text-slate-100">
        <ThemeProvider>
          <SessionProvider>
            <OnboardingGate>
              <MaintenanceGate>
                <Navbar />
                <div className="pb-bottom-nav md:pb-0 min-h-screen flex flex-col">
                  {children}
                  <Footer />
                </div>
                <BottomNav />
              </MaintenanceGate>
            </OnboardingGate>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
