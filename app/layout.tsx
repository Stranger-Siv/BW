import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PusherProvider } from "@/components/providers/PusherProvider";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { OnboardingGate } from "@/components/OnboardingGate";

export const metadata: Metadata = {
  title: "BedWars Tournament",
  description:
    "Register for BedWars tournaments. Defend your bed, break theirs, claim victory. Sponsored by BABA TILLU.",
  icons: {
    icon: [
      { url: "/favicon-new.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-new.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-new.png", sizes: "64x64", type: "image/png" },
    ],
    apple: { url: "/favicon-new.png", sizes: "180x180", type: "image/png" },
  },
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
              <PusherProvider>
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
              </PusherProvider>
            </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
