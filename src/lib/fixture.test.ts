import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("carga inicial Atlas", () => {
  it("contém 120 chaves únicas na versão 1", async () => { const rows = parseCsv(await readFile(resolve("fixtures/vendas_atlas_tratada.csv"), "utf8")); expect(rows).toHaveLength(120); expect(new Set(rows.map((r) => `${r.proposta_id}:${r.versao}`)).size).toBe(120); expect(rows.every((r) => r.versao === "1")).toBe(true); });
  it("concilia os indicadores históricos e a carteira", async () => { const rows = parseCsv(await readFile(resolve("fixtures/vendas_atlas_tratada.csv"), "utf8")); const num = (v: string) => Number(v || 0); const ganhas = rows.filter((r) => r.etapa === "Ganho"); const abertas = rows.filter((r) => ["Qualificacao", "Proposta", "Negociacao"].includes(r.etapa)); expect(ganhas).toHaveLength(60); expect(ganhas.reduce((s,r)=>s+num(r.valor_liquido),0)).toBe(2268000); expect(abertas.reduce((s,r)=>s+num(r.valor_liquido),0)).toBe(1407600); expect(abertas.reduce((s,r)=>s+num(r.valor_ponderado),0)).toBe(661080); });
  it("mantém as três exceções comerciais", async () => { const rows = parseCsv(await readFile(resolve("fixtures/excecoes_comerciais.csv"), "utf8")); expect(rows.map((r) => r.proposta_id)).toEqual(["ATL-2026-0108", "ATL-2026-0109", "ATL-2026-0110"]); });
});
