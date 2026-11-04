import Image from "next/image";
import Link from "next/link";
import { isConfigured } from "@/lib/supabase/server";

export function Shell({ children }: { children: React.ReactNode }) {
  const demo = !isConfigured();
  return <div className="shell"><aside className="sidebar"><Image src="/brand/atlas-logo.svg" alt="Atlas" width={148} height={48} priority /><p className="tagline">Cada oportunidade<br />com um próximo passo.</p><nav><Link href="/dashboard">Visão geral</Link><Link href="/propostas">Propostas</Link><Link href="/propostas/nova">Nova proposta</Link></nav><div className="sidebarFoot"><span className="statusDot" />{demo ? "Prévia com dados fictícios" : "Conectado ao Supabase"}</div></aside><main className="content">{demo && <div className="demoBanner"><strong>Modo de prévia</strong> — leitura da carga inicial; conecte o Supabase para persistir alterações.</div>}{children}</main></div>;
}
