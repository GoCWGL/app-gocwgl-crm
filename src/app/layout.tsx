import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "@/styles/main.scss";
import { RouteLoader } from "@/components/layout";
import { AppProviders } from "@/utils/providers";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "GoCWGL",
    template: "%s · GoCWGL",
  },
  description: "GoCWGL CRM: admin dashboard and client portal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AppProviders>
          {children}
          <RouteLoader />
        </AppProviders>
      </body>
    </html>
  );
}
