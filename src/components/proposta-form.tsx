"use client";
import { useActionState } from "react";
import { salvarProposta } from "@/app/(crm)/propostas/actions";
import type { Proposta } from "@/lib/types";

type Cadastro = Record<string, string | number | null>;
export function PropostaForm({ proposta, cadastros }: { proposta?: Proposta; cadastros: { clientes: Cadastro[]; vendedores: Cadastro[]; produtos: Cadastro[] } }) {
  const [state, action, pending] = useActionState(salvarProposta, {});
  const field = (name: string) => state.campos?.[name]?.[0];
  return <form action={action} className="formPanel"><input type="hidden" name="modo" value={proposta ? "editar" : "novo"} /><div className="formGrid">
    <label>Código da proposta<input name="proposta_id" defaultValue={proposta?.proposta_id ?? "ATL-2026-"} readOnly={Boolean(proposta)} required />{field("proposta_id") && <small className="error">{field("proposta_id")}</small>}</label>
    <label>Cliente<select name="cliente_id" defaultValue={proposta?.cliente_id} required><option value="">Selecione</option>{cadastros.clientes.map((c) => <option key={String(c.cliente_id)} value={String(c.cliente_id)}>{String(c.empresa)}</option>)}</select></label>
    <label>Responsável<select name="vendedor_id" defaultValue={proposta?.vendedor_id} required><option value="">Selecione</option>{cadastros.vendedores.map((v) => <option key={String(v.vendedor_id)} value={String(v.vendedor_id)}>{String(v.nome)}</option>)}</select></label>
    <label>Produto<select name="produto_id" defaultValue={proposta?.produto_id} required><option value="">Selecione</option>{cadastros.produtos.map((p) => <option key={String(p.produto_id)} value={String(p.produto_id)}>{String(p.nome)}</option>)}</select></label>
    <label>Região<select name="regiao" defaultValue={proposta?.regiao}><option>Sudeste</option><option>Sul</option><option>Nordeste</option><option>Centro-Oeste</option></select></label>
    <label>Canal<select name="canal" defaultValue={proposta?.canal}><option>Indicacao</option><option>Inbound</option><option>Outbound</option></select></label>
    <label>Data de criação<input type="date" name="data_criacao" defaultValue={proposta?.data_criacao ?? "2026-11-03"} /></label><label>Validade<input type="date" name="validade" defaultValue={proposta?.validade ?? "2026-12-03"} /></label>
    <label>Etapa<select name="etapa" defaultValue={proposta?.etapa ?? "Qualificacao"}><option>Qualificacao</option><option>Proposta</option><option>Negociacao</option><option>Perdido</option></select></label>
    <label>Quantidade<input type="number" name="quantidade" min="1" step="1" defaultValue={proposta?.quantidade ?? 1} /></label><label>Preço unitário (R$)<input type="number" name="preco_unitario" min="0.01" step="0.01" defaultValue={proposta?.preco_unitario} /></label><label>Desconto (fração)<input type="number" name="desconto_pct" min="0" max="1" step="0.01" defaultValue={proposta?.desconto_pct ?? 0} /></label><label>Custo total (R$)<input type="number" name="custo_total" min="0" step="0.01" defaultValue={proposta?.custo_total} /></label>
    <label className="wide">Condição de pagamento<input name="condicao_pagamento" defaultValue={proposta?.condicao_pagamento ?? "50% no aceite e 50% na entrega"} /></label><label className="wide">Próxima ação<textarea name="proxima_acao" defaultValue={proposta?.proxima_acao ?? ""} /></label><label className="wide">Motivo da perda<textarea name="motivo_perda" defaultValue={proposta?.motivo_perda ?? ""} /></label>
  </div>{state.erro && <p className="error" role="alert">{state.erro}</p>}<div className="formActions"><a className="button secondary" href={proposta ? `/propostas/${proposta.proposta_id}` : "/propostas"}>Cancelar</a><button className="button primary" disabled={pending}>{pending ? "Salvando…" : "Salvar proposta"}</button></div></form>;
}
