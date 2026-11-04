import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Atlas CRM", description: "Cada oportunidade com um próximo passo." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
