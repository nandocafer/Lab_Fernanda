import { PropostaForm } from "@/components/proposta-form";
import { getCadastros } from "@/lib/data";
export default async function NovaPage() { return <><header className="pageHeader"><div><span className="eyebrow">Cadastro</span><h1>Nova proposta</h1><p>Informe as condições comerciais vigentes.</p></div></header><PropostaForm cadastros={await getCadastros()} /></>; }
