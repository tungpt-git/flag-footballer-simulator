import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import { AppHeader } from "@/shared/ui/layout/AppHeader";
import { AppSidebar, MobileTabBar } from "@/shared/ui/layout/AppSidebar";
import { Toaster } from "@/shared/ui/primitives/sonner";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";
import { THEME_INIT_SCRIPT } from "@/shared/ui/theme";
import { ModeSwitcher } from "@/modules/simulation/ui";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const jetBrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flag Football Lab",
  description: "Manage flag football players and simulate routes, coverage and tactical decisions.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090d12" },
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
  ],
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html
    lang="en"
    suppressHydrationWarning
    className={`${inter.variable} ${barlowCondensed.variable} ${jetBrainsMono.variable} dark h-full`}
  >
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
    </head>
    <body className="flex h-dvh flex-col">
      <TooltipProvider>
        <AppHeader modeSwitcher={<ModeSwitcher />} />
        <div className="flex min-h-0 flex-1">
          <AppSidebar />
          <main id="main-content" className="scroll-thin min-w-0 flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
        <MobileTabBar />
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </body>
  </html>
);

export default RootLayout;
