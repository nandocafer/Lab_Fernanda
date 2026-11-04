import { z } from "zod";
import type { Proposta } from "./types";

export const propostaSchema = z.object({
  proposta_id: z.string().regex(/^ATL-2026-\d{4}$/, "Use o formato ATL-2026-NNNN"),
  cliente_id: z.string().min(1, "Selecione o cliente"),
  vendedor_id: z.string().min(1, "Selecione o responsável"),
  produto_id: z.string().min(1, "Selecione o produto"),
  regiao: z.string().min(1), canal: z.enum(["Indicacao", "Inbound", "Outbound"]),
  data_criacao: z.iso.date(), validade: z.iso.date(),
  etapa: z.enum(["Qualificacao", "Proposta", "Negociacao", "Perdido"]),
  quantidade: z.coerce.number().int().positive(),
  preco_unitario: z.coerce.number().positive(), desconto_pct: z.coerce.number().min(0).max(1),
  custo_total: z.coerce.number().min(0), condicao_pagamento: z.string().min(1),
  proxima_acao: z.string().optional(), motivo_perda: z.string().optional(),
}).refine((p) => p.validade >= p.data_criacao, { message: "A validade não pode ser anterior à criação", path: ["validade"] });

export function calcularValores(input: Pick<Proposta, "quantidade" | "preco_unitario" | "desconto_pct" | "custo_total" | "etapa" | "probabilidade">) {
  const valor_bruto = Math.round(input.quantidade * input.preco_unitario * 100) / 100;
  const valor_liquido = Math.round(valor_bruto * (1 - input.desconto_pct) * 100) / 100;
  const margem_pct = valor_liquido === 0 ? 0 : (valor_liquido - input.custo_total) / valor_liquido;
  const aberto = ["Qualificacao", "Proposta", "Negociacao"].includes(input.etapa);
  const valor_ponderado = aberto ? Math.round(valor_liquido * input.probabilidade * 100) / 100 : 0;
  return { valor_bruto, valor_liquido, margem_pct, valor_ponderado };
}

export function alertaComercial(p: Pick<Proposta, "desconto_pct" | "margem_pct" | "aprovacao_desconto" | "validade">, hoje = "2026-10-31") {
  if (p.desconto_pct > 0.15) return "Desconto acima de 15%: revisão de diretoria obrigatória";
  if (p.desconto_pct > 0.05 && !p.aprovacao_desconto) return "Desconto sem aprovação compatível";
  if (p.margem_pct < 0.25) return "Margem abaixo do piso de 25%";
  if (p.validade < hoje) return "Validade vencida";
  return null;
}

export function podeGanhar(p: Proposta, hoje: string) {
  if (!["Proposta", "Negociacao"].includes(p.etapa)) return { ok: false, motivo: "Etapa não elegível" };
  if (!p.vigente) return { ok: false, motivo: "Somente a versão vigente pode ser aceita" };
  const alerta = alertaComercial(p, hoje);
  if (alerta) return { ok: false, motivo: alerta };
  return { ok: true, motivo: null };
}
