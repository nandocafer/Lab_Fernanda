"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="empty"><h2>Não foi possível carregar os dados.</h2><p>Tente novamente. Se o problema continuar, verifique a conexão com o Supabase.</p><button className="button primary" onClick={reset}>Tentar novamente</button></div>; }
