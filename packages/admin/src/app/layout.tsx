import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import IsAdmin from "@/components/is-admin";
import { TRPCProvider } from "@/trpc/react";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardProvider } from "@/contexts/dashboard-context";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TRPCProvider>
              <IsAdmin>
                <DashboardProvider>
                  <SidebarProvider
                    style={
                      {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height": "calc(var(--spacing) * 12)",
                      } as React.CSSProperties
                    }
                  >
                    <AppSidebar variant="inset" />
                    <SidebarInset>
                      <SiteHeader />
                      {children}
                      <Toaster />
                    </SidebarInset>
                  </SidebarProvider>
                </DashboardProvider>
              </IsAdmin>
            </TRPCProvider>
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
