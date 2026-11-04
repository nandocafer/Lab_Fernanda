"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault(); setCarregando(true); setErro(""); setMensagem("");
    const { error } = await createClient().auth.signInWithPassword({ email, password: senha });
    if (error) { setErro("Não foi possível entrar. Confira e-mail e senha."); setCarregando(false); }
    else router.push("/dashboard");
  }

  async function cadastrar() {
    setCarregando(true); setErro(""); setMensagem("");
    if (senha.length < 8) { setErro("A senha precisa ter pelo menos 8 caracteres."); setCarregando(false); return; }
    const { data, error } = await createClient().auth.signUp({ email, password: senha, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    if (error) setErro(error.message);
    else if (data.session) router.push("/dashboard");
    else setMensagem("Conta criada. Confirme o e-mail para entrar.");
    setCarregando(false);
  }

  return <form onSubmit={entrar} className="loginForm">
    <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
    <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} autoComplete="current-password" /></label>
    {erro && <p className="error" role="alert">{erro}</p>}{mensagem && <p className="success" role="status">{mensagem}</p>}
    <button className="button primary" disabled={carregando}>{carregando ? "Aguarde…" : "Entrar"}</button>
    <button className="button secondary" type="button" disabled={carregando || !email || senha.length < 8} onClick={cadastrar}>Criar primeiro acesso</button>
  </form>;
}
