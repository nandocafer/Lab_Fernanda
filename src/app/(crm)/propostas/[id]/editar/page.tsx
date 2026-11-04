import { notFound } from "next/navigation";
import { PropostaForm } from "@/components/proposta-form";
import { getCadastros, getProposta } from "@/lib/data";
export default async function EditarPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [p, cadastros] = await Promise.all([getProposta(id), getCadastros()]); if (!p || p.etapa === "Ganho") notFound(); return <><header className="pageHeader"><div><span className="eyebrow">Edição · versão {p.versao}</span><h1>{p.proposta_id}</h1><p>Atualize somente os campos permitidos.</p></div></header><PropostaForm proposta={p} cadastros={cadastros} /></>; }
