import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "ATLAS_IMPORT_OWNER_ID"];
for (const name of required) if (!process.env[name]) throw new Error(`Variável obrigatória ausente: ${name}`);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const owner_id = process.env.ATLAS_IMPORT_OWNER_ID;

function parseCsv(text) {
  const rows=[]; let row=[],field="",quoted=false; const source=text.replace(/^\uFEFF/,"");
  for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'&&quoted&&source[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===';'&&!quoted){row.push(field);field="";}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;} if(field||row.length){row.push(field);rows.push(row);} const [head,...data]=rows; return data.map(values=>Object.fromEntries(head.map((h,i)=>[h,values[i]??""])));
}
async function fixture(name){return parseCsv(await readFile(resolve("fixtures",`${name}.csv`),"utf8"));}
async function check(result, label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data;}

const source = await readFile(resolve("fixtures/vendas_atlas_tratada.csv"));
const sha256 = createHash("sha256").update(source).digest("hex");
const proposals = parseCsv(source.toString("utf8"));
const existingBatch = await supabase.from("import_batches").select("id").eq("owner_id",owner_id).eq("sha256",sha256).maybeSingle();
let batchId = existingBatch.data?.id;
if(!batchId){const batch=await check(await supabase.from("import_batches").insert({owner_id,sha256,arquivo:"vendas_atlas_tratada.csv",linhas:proposals.length}).select("id").single(),"lote");batchId=batch.id;}

for(const [table,key,rows] of [
  ["clientes","cliente_id",await fixture("clientes")], ["vendedores","vendedor_id",await fixture("vendedores")],
  ["produtos","produto_id",await fixture("produtos")], ["metas","mes",await fixture("metas")],
]) await check(await supabase.from(table).upsert(rows.map(r=>({...r,owner_id})),{onConflict:`owner_id,${key}`}),table);

await check(await supabase.from("aprovacoes").upsert([
  {owner_id,aprovacao_id:"GER-2026-01",lote:"lote-didatico",limite_desconto:.15,aprovador:"Gerência Atlas",aprovado_em:"2026-05-01T09:00:00-03:00"},
  {owner_id,aprovacao_id:"GER-2026-118",proposta_id:"ATL-2026-0118",versao:1,limite_desconto:.10,aprovador:"Gerência Atlas",aprovado_em:"2026-10-20T09:00:00-03:00"},
],{onConflict:"owner_id,aprovacao_id"}),"aprovações");

const current = await check(await supabase.from("propostas").select("proposta_id,versao,source_hash").eq("owner_id",owner_id),"propostas existentes");
const known = new Map(current.map(r=>[`${r.proposta_id}:${r.versao}`,r.source_hash])); const inserts=[]; const conflicts=[];
for(const p of proposals){const source_hash=createHash("sha256").update(JSON.stringify(p)).digest("hex");const key=`${p.proposta_id}:${p.versao}`;if(known.has(key)){if(known.get(key)!==source_hash)conflicts.push({owner_id,batch_id:batchId,proposta_id:p.proposta_id,versao:Number(p.versao),motivo:"Chave existente com conteúdo diferente; revisão necessária"});continue;} inserts.push({owner_id,batch_id:batchId,source_hash,proposta_id:p.proposta_id,versao:Number(p.versao),vigente:true,cliente_id:p.cliente_id,vendedor_id:p.vendedor_id,produto_id:p.produto_id,regiao:p.regiao,canal:p.canal,data_criacao:p.data_criacao,data_fechamento:p.data_fechamento||null,validade:p.validade,etapa:p.etapa,quantidade:Number(p.quantidade),preco_unitario:Number(p.preco_unitario),desconto_pct:Number(p.desconto_pct),custo_total:Number(p.custo_total),aprovacao_desconto:p.aprovacao_desconto||null,probabilidade:Number(p.probabilidade),condicao_pagamento:p.condicao_pagamento,motivo_perda:p.motivo_perda||null,proxima_acao:p.proxima_acao||null});}
for(let i=0;i<inserts.length;i+=50)await check(await supabase.from("propostas").insert(inserts.slice(i,i+50)),"carga de propostas");
if(inserts.length)await check(await supabase.from("historico_propostas").insert(inserts.map(p=>({owner_id,proposta_id:p.proposta_id,versao:p.versao,de:null,para:p.etapa,ocorrido_em:`${p.data_criacao}T12:00:00-03:00`,origem:"carga_inicial",ator:"importador_atlas"}))),"histórico inicial");
if(conflicts.length)await check(await supabase.from("import_conflitos").insert(conflicts),"conflitos");
console.log(JSON.stringify({batch_id:batchId,sha256,total:proposals.length,inseridas:inserts.length,ignoradas:proposals.length-inserts.length,conflitos:conflicts.length},null,2));
