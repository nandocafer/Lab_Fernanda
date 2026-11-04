import Image from "next/image";
import Link from "next/link";
import { isConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default function LoginPage() { const configured = isConfigured(); return <main className="loginPage"><section className="loginBrand"><Image src="/brand/atlas-logo.svg" alt="Atlas" width={180} height={58} /><h1>Transforme propostas em próximos passos claros.</h1><p>CRM comercial Atlas para acompanhar carteira, condições e histórico.</p></section><section className="loginCard"><span className="eyebrow">Acesso seguro</span><h2>Bem-vinda ao Atlas CRM</h2><p>Entre com a conta autorizada da sua turma.</p>{configured ? <LoginForm /> : <><div className="empty"><strong>Supabase ainda não configurado</strong><p>A prévia usa somente os dados fictícios da carga inicial e não grava alterações.</p></div><Link className="button primary" href="/dashboard">Abrir prévia do laboratório</Link></>}</section></main>; }
