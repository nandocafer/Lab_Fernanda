import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv";
import { alertaComercial } from "./rules";
import { createClient, isConfigured } from "./supabase/server";
import type { Filtros, Proposta } from "./types";

function numeric(value: string) { return Number(value || 0); }
async function demoPropostas(): Promise<Proposta[]> {
  const raw = await readFile(path.join(process.cwd(), "fixtures/vendas_atlas_tratada.csv"), "utf8");
  const alertas = new Map<string, string>();
  const exc = parseCsv(await readFile(path.join(process.cwd(), "fixtures/excecoes_comerciais.csv"), "utf8"));
  exc.forEach((e) => alertas.set(`${e.proposta_id}:${e.versao}`, e.regra));
  return parseCsv(raw).map((p) => ({
    proposta_id: p.proposta_id, versao: numeric(p.versao), vigente: true, cliente_id: p.cliente_id,
    empresa: p.empresa, email_aceite: p.email_aceite, vendedor_id: p.vendedor_id, vendedor: p.vendedor,
    regiao: p.regiao, canal: p.canal, produto_id: p.produto_id, produto: p.produto,
    data_criacao: p.data_criacao, data_fechamento: p.data_fechamento || null, validade: p.validade,
    etapa: p.etapa as Proposta["etapa"], quantidade: numeric(p.quantidade), preco_unitario: numeric(p.preco_unitario),
    desconto_pct: numeric(p.desconto_pct), custo_total: numeric(p.custo_total), aprovacao_desconto: p.aprovacao_desconto || null,
    probabilidade: numeric(p.probabilidade), condicao_pagamento: p.condicao_pagamento,
    motivo_perda: p.motivo_perda || null, proxima_acao: p.proxima_acao || null,
    valor_bruto: numeric(p.valor_bruto), valor_liquido: numeric(p.valor_liquido), margem_pct: numeric(p.margem_pct),
    valor_ponderado: numeric(p.valor_ponderado), alerta: alertas.get(`${p.proposta_id}:${p.versao}`) ?? alertaComercial({ desconto_pct: numeric(p.desconto_pct), margem_pct: numeric(p.margem_pct), aprovacao_desconto: p.aprovacao_desconto, validade: p.validade }),
  }));
}

export async function getPropostas(filtros: Filtros = {}) {
  let rows: Proposta[];
  if (!isConfigured()) rows = await demoPropostas();
  else {
    const supabase = await createClient();
    const { data, error } = await supabase.from("propostas_detalhadas").select("*").eq("vigente", true).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    rows = (data ?? []) as Proposta[];
  }
  const search = filtros.busca?.toLocaleLowerCase("pt-BR");
  return rows.filter((p) => (!search || `${p.proposta_id} ${p.empresa}`.toLocaleLowerCase("pt-BR").includes(search))
    && (!filtros.etapa || p.etapa === filtros.etapa) && (!filtros.vendedor || p.vendedor_id === filtros.vendedor)
    && (!filtros.regiao || p.regiao === filtros.regiao) && (!filtros.produto || p.produto_id === filtros.produto)
    && (!filtros.canal || p.canal === filtros.canal));
}

export async function getProposta(id: string) {
  const propostas = await getPropostas();
  return propostas.find((p) => p.proposta_id === id) ?? null;
}

export async function getHistorico(id: string) {
  if (!isConfigured()) {
    const p = await getProposta(id);
    return p ? [{ id: "inicial", de: null, para: p.etapa, ocorrido_em: `${p.data_criacao}T12:00:00-03:00`, origem: "carga_inicial", ator: "Importação Atlas" }] : [];
  }
  const supabase = await createClient();
  const { data } = await supabase.from("historico_propostas").select("*").eq("proposta_id", id).order("ocorrido_em", { ascending: false });
  return data ?? [];
}

export async function getDashboard(filtros: Filtros = {}) {
  const rows = await getPropostas(filtros);
  const ganhas = rows.filter((p) => p.etapa === "Ganho"); const perdidas = rows.filter((p) => p.etapa === "Perdido");
  const abertas = rows.filter((p) => ["Qualificacao", "Proposta", "Negociacao"].includes(p.etapa));
  const vendas = ganhas.reduce((s, p) => s + p.valor_liquido, 0);
  return { rows, vendas, ganhas: ganhas.length, perdidas: perdidas.length, taxa: ganhas.length + perdidas.length ? ganhas.length / (ganhas.length + perdidas.length) : null,
    ticket: ganhas.length ? vendas / ganhas.length : null, margem: vendas ? ganhas.reduce((s, p) => s + p.valor_liquido - p.custo_total, 0) / vendas : null,
    pipeline: abertas.reduce((s, p) => s + p.valor_liquido, 0), ponderado: abertas.reduce((s, p) => s + p.valor_ponderado, 0), abertas: abertas.length };
}

export async function getCadastros() {
  if (!isConfigured()) {
    const read = async (name: string) => parseCsv(await readFile(path.join(process.cwd(), `fixtures/${name}.csv`), "utf8"));
    return { clientes: await read("clientes"), vendedores: await read("vendedores"), produtos: await read("produtos") };
  }
  const s = await createClient();
  const [clientes, vendedores, produtos] = await Promise.all([s.from("clientes").select("*"), s.from("vendedores").select("*"), s.from("produtos").select("*")]);
  return { clientes: clientes.data ?? [], vendedores: vendedores.data ?? [], produtos: produtos.data ?? [] };
}
