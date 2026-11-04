"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [senha, setSenha] = useState(""); const [erro, setErro] = useState(""); const [carregando, setCarregando] = useState(false);
  async function entrar(e: React.FormEvent) { e.preventDefault(); setCarregando(true); setErro(""); const { error } = await createClient().auth.signInWithPassword({ email, password: senha }); if (error) { setErro("Não foi possível entrar. Confira e-mail e senha."); setCarregando(false); } else router.push("/dashboard"); }
  return <form onSubmit={entrar} className="loginForm"><label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label><label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" /></label>{erro && <p className="error" role="alert">{erro}</p>}<button className="button primary" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button></form>;
}
