import { describe, expect, it } from "vitest";
import { alertaComercial, calcularValores, podeGanhar } from "./rules";
import type { Proposta } from "./types";

const base = { quantidade: 1, preco_unitario: 48000, desconto_pct: 0.1, custo_total: 25200, etapa: "Negociacao" as const, probabilidade: 0.75 };

describe("regras comerciais", () => {
  it("calcula os valores da proposta 118", () => expect(calcularValores(base)).toEqual({ valor_bruto: 48000, valor_liquido: 43200, margem_pct: 0.4166666666666667, valor_ponderado: 32400 }));
  it("preserva e sinaliza as três exceções comerciais", () => {
    expect(alertaComercial({ desconto_pct: 0, margem_pct: 0.08, aprovacao_desconto: null, validade: "2026-12-01" })).toMatch(/Margem/);
    expect(alertaComercial({ desconto_pct: 0.2, margem_pct: 0.5, aprovacao_desconto: null, validade: "2026-12-01" })).toMatch(/15%/);
    expect(alertaComercial({ desconto_pct: 0, margem_pct: 0.5, aprovacao_desconto: null, validade: "2026-10-15" })).toMatch(/vencida/);
  });
  it("bloqueia ganho automático quando há alerta", () => {
    const p = { ...base, proposta_id: "ATL-2026-0118", versao: 1, vigente: true, cliente_id: "CLI-01", empresa: "X", vendedor_id: "VEN-01", vendedor: "Ana", regiao: "Sudeste", canal: "Inbound", produto_id: "PRD-03", produto: "Automação", data_criacao: "2026-10-01", validade: "2026-11-30", condicao_pagamento: "50% no aceite e 50% na entrega", valor_bruto: 48000, valor_liquido: 43200, margem_pct: 0.416, valor_ponderado: 32400, aprovacao_desconto: null } as Proposta;
    expect(podeGanhar(p, "2026-11-03").ok).toBe(false);
  });
});
