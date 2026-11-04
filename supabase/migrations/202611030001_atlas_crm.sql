create extension if not exists pgcrypto;
create schema if not exists private;

create table public.clientes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  cliente_id text not null, empresa text not null, contato text not null, email_aceite text not null,
  segmento text not null, regiao text not null,
  primary key (owner_id, cliente_id)
);
create table public.vendedores (
  owner_id uuid not null references auth.users(id) on delete cascade,
  vendedor_id text not null, nome text not null, regiao text not null,
  primary key (owner_id, vendedor_id)
);
create table public.produtos (
  owner_id uuid not null references auth.users(id) on delete cascade,
  produto_id text not null, nome text not null, preco_unitario numeric(14,2) not null check (preco_unitario > 0),
  custo_unitario numeric(14,2) not null check (custo_unitario >= 0), escopo text not null,
  primary key (owner_id, produto_id)
);
create table public.metas (
  owner_id uuid not null references auth.users(id) on delete cascade,
  mes date not null check (date_trunc('month', mes)::date = mes), meta_vendas_ganhas numeric(14,2) not null check (meta_vendas_ganhas >= 0),
  primary key (owner_id, mes)
);
create table public.import_batches (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  sha256 text not null, arquivo text not null, importado_em timestamptz not null default now(), linhas integer not null,
  unique (owner_id, sha256)
);
create table public.import_conflitos (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.import_batches(id), proposta_id text not null, versao integer not null,
  motivo text not null, detectado_em timestamptz not null default now(), resolvido_em timestamptz
);
create table public.propostas (
  owner_id uuid not null references auth.users(id) on delete cascade,
  proposta_id text not null check (proposta_id ~ '^ATL-2026-[0-9]{4}$'), versao integer not null check (versao > 0), vigente boolean not null default true,
  cliente_id text not null, vendedor_id text not null, produto_id text not null, regiao text not null,
  canal text not null check (canal in ('Indicacao','Inbound','Outbound')), data_criacao date not null, data_fechamento date,
  validade date not null, etapa text not null check (etapa in ('Qualificacao','Proposta','Negociacao','Ganho','Perdido')),
  quantidade integer not null check (quantidade > 0), preco_unitario numeric(14,2) not null check (preco_unitario > 0),
  desconto_pct numeric(7,6) not null check (desconto_pct between 0 and 1), custo_total numeric(14,2) not null check (custo_total >= 0),
  aprovacao_desconto text, probabilidade numeric(5,4) not null check (probabilidade between 0 and 1),
  condicao_pagamento text not null, motivo_perda text, proxima_acao text,
  valor_bruto numeric(14,2) generated always as (round(quantidade * preco_unitario, 2)) stored,
  valor_liquido numeric(14,2) generated always as (round(quantidade * preco_unitario * (1 - desconto_pct), 2)) stored,
  margem_pct numeric generated always as (case when round(quantidade * preco_unitario * (1 - desconto_pct), 2) = 0 then null else (round(quantidade * preco_unitario * (1 - desconto_pct), 2) - custo_total) / round(quantidade * preco_unitario * (1 - desconto_pct), 2) end) stored,
  valor_ponderado numeric(14,2) generated always as (case when etapa in ('Qualificacao','Proposta','Negociacao') then round(round(quantidade * preco_unitario * (1 - desconto_pct), 2) * probabilidade, 2) else 0 end) stored,
  row_version integer not null default 1, updated_at timestamptz not null default now(), batch_id uuid references public.import_batches(id), source_hash text,
  primary key (owner_id, proposta_id, versao),
  foreign key (owner_id, cliente_id) references public.clientes(owner_id, cliente_id),
  foreign key (owner_id, vendedor_id) references public.vendedores(owner_id, vendedor_id),
  foreign key (owner_id, produto_id) references public.produtos(owner_id, produto_id),
  check (data_fechamento is null or data_fechamento >= data_criacao),
  check ((etapa in ('Ganho','Perdido') and data_fechamento is not null) or (etapa not in ('Ganho','Perdido'))),
  check ((etapa = 'Perdido' and motivo_perda is not null) or etapa <> 'Perdido')
);
create unique index propostas_uma_vigente on public.propostas(owner_id, proposta_id) where vigente;
create index propostas_cliente_idx on public.propostas(owner_id, cliente_id);
create index propostas_vendedor_idx on public.propostas(owner_id, vendedor_id);
create index propostas_produto_idx on public.propostas(owner_id, produto_id);
create index propostas_batch_idx on public.propostas(batch_id);

create table public.aprovacoes (
  owner_id uuid not null references auth.users(id) on delete cascade, aprovacao_id text not null,
  proposta_id text, lote text, versao integer, limite_desconto numeric(7,6) not null check (limite_desconto between 0 and 1),
  aprovador text not null, aprovado_em timestamptz not null, primary key (owner_id, aprovacao_id),
  check (proposta_id is not null or lote is not null)
);
create table public.historico_propostas (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null, proposta_id text not null, versao integer not null,
  de text, para text not null, ocorrido_em timestamptz not null default now(), origem text not null,
  provider_message_id text, ator text not null,
  foreign key (owner_id, proposta_id, versao) references public.propostas(owner_id, proposta_id, versao)
);
create table public.email_processamentos (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  mailbox_id text not null, provider_message_id text not null, provider_thread_id text, recebido_em timestamptz,
  codigo_extraido text, versao_extraida integer, decisao text, motivo text,
  estado text not null default 'recebido', correlation_id uuid not null default gen_random_uuid(),
  unique (mailbox_id, provider_message_id)
);
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null, proposta_id text not null, versao integer not null,
  processamento_id uuid references public.email_processamentos(id), tipo_confirmacao text not null default 'aceite',
  destinatario_validado text not null, assunto text not null, corpo text not null,
  estado text not null default 'pendente' check (estado in ('pendente','enviando','enviado','falhou','envio_incerto')),
  provider_sent_message_id text, tentativas integer not null default 0, erro text, updated_at timestamptz not null default now(),
  foreign key (owner_id, proposta_id, versao) references public.propostas(owner_id, proposta_id, versao),
  unique (owner_id, proposta_id, versao, tipo_confirmacao)
);
create index import_conflitos_owner_idx on public.import_conflitos(owner_id);
create index import_conflitos_batch_idx on public.import_conflitos(batch_id);
create index historico_proposta_idx on public.historico_propostas(owner_id, proposta_id, versao);
create index email_processamentos_owner_idx on public.email_processamentos(owner_id);
create index email_outbox_processamento_idx on public.email_outbox(processamento_id);

create or replace function private.prepare_proposta() returns trigger language plpgsql set search_path = '' as $$
begin
  new.probabilidade := case new.etapa when 'Qualificacao' then .20 when 'Proposta' then .50 when 'Negociacao' then .75 when 'Ganho' then 1 else 0 end;
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.row_version := old.row_version + 1;
    if old.etapa = 'Ganho' then raise exception 'Proposta ganha é imutável'; end if;
    if old.etapa = 'Perdido' and new.etapa <> old.etapa then raise exception 'Reabertura de perdido exige revisão e nova versão'; end if;
    if new.aprovacao_desconto is distinct from old.aprovacao_desconto and current_user <> 'service_role' then raise exception 'Aprovações são geridas em cadastro protegido'; end if;
    if new.etapa = 'Ganho' and current_setting('atlas.registrar_ganho', true) <> 'on' then raise exception 'Ganho só pode ser registrado pela função autorizada'; end if;
    if new.owner_id <> old.owner_id or new.proposta_id <> old.proposta_id or new.versao <> old.versao then raise exception 'Chaves da proposta são imutáveis'; end if;
  elsif new.etapa = 'Ganho' and current_user <> 'service_role' then raise exception 'Ganho só pode ser registrado pela função autorizada';
  elsif new.aprovacao_desconto is not null and current_user <> 'service_role' then raise exception 'Aprovações são geridas em cadastro protegido';
  end if;
  return new;
end $$;
create trigger propostas_prepare before insert or update on public.propostas for each row execute function private.prepare_proposta();

create or replace view public.propostas_detalhadas with (security_invoker = true) as
select p.*, c.empresa, c.email_aceite, v.nome as vendedor, pr.nome as produto,
  case when p.desconto_pct > .15 then 'Desconto acima de 15%'
       when p.desconto_pct > .05 and p.aprovacao_desconto is null then 'Desconto sem aprovação compatível'
       when p.margem_pct < .25 then 'Margem abaixo do piso de 25%'
       when p.validade < (current_timestamp at time zone 'America/Sao_Paulo')::date then 'Validade vencida' end as alerta
from public.propostas p
join public.clientes c using (owner_id, cliente_id)
join public.vendedores v using (owner_id, vendedor_id)
join public.produtos pr using (owner_id, produto_id);

create or replace function public.registrar_ganho(p_proposta_id text, p_versao integer, p_processamento_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_role text := coalesce(auth.jwt()->'app_metadata'->>'crm_role','vendedor'); v_p public.propostas%rowtype; v_email text;
begin
  if v_owner is null or v_role not in ('gerente','administrador') then raise exception 'Operação não autorizada'; end if;
  select * into v_p from public.propostas where owner_id=v_owner and proposta_id=p_proposta_id and versao=p_versao and vigente for update;
  if not found then raise exception 'Proposta vigente não encontrada'; end if;
  if v_p.etapa='Ganho' then return jsonb_build_object('estado','sem_efeito','proposta_id',p_proposta_id); end if;
  if v_p.etapa not in ('Proposta','Negociacao') then raise exception 'Etapa não elegível'; end if;
  if v_p.validade < (current_timestamp at time zone 'America/Sao_Paulo')::date then raise exception 'Validade vencida'; end if;
  if v_p.desconto_pct > .15 or v_p.margem_pct < .25 then raise exception 'Alerta comercial bloqueia ganho automático'; end if;
  if v_p.desconto_pct > .05 and not exists(select 1 from public.aprovacoes a where a.owner_id=v_owner and a.aprovacao_id=v_p.aprovacao_desconto and a.limite_desconto>=v_p.desconto_pct and (a.proposta_id is null or (a.proposta_id=v_p.proposta_id and (a.versao is null or a.versao=v_p.versao)))) then raise exception 'Aprovação ausente ou incompatível'; end if;
  perform set_config('atlas.registrar_ganho','on',true);
  update public.propostas set etapa='Ganho', data_fechamento=(current_timestamp at time zone 'America/Sao_Paulo')::date where owner_id=v_owner and proposta_id=p_proposta_id and versao=p_versao;
  insert into public.historico_propostas(owner_id,proposta_id,versao,de,para,origem,provider_message_id,ator) values(v_owner,p_proposta_id,p_versao,v_p.etapa,'Ganho','funcao_registrar_ganho',(select provider_message_id from public.email_processamentos where id=p_processamento_id),v_owner::text);
  select email_aceite into v_email from public.clientes where owner_id=v_owner and cliente_id=v_p.cliente_id;
  insert into public.email_outbox(owner_id,proposta_id,versao,processamento_id,destinatario_validado,assunto,corpo)
  values(v_owner,p_proposta_id,p_versao,p_processamento_id,v_email,'Aceite registrado — '||p_proposta_id,'Registramos o aceite da proposta '||p_proposta_id||', versão '||p_versao||'. Para organizar o alinhamento inicial, informe o contato de implantação e duas opções de horário. A equipe Atlas validará a agenda e retornará com a confirmação.')
  on conflict (owner_id,proposta_id,versao,tipo_confirmacao) do nothing;
  return jsonb_build_object('estado','ganho_registrado','proposta_id',p_proposta_id,'versao',p_versao);
end $$;

alter table public.clientes enable row level security; alter table public.vendedores enable row level security; alter table public.produtos enable row level security;
alter table public.metas enable row level security; alter table public.import_batches enable row level security; alter table public.import_conflitos enable row level security;
alter table public.propostas enable row level security; alter table public.aprovacoes enable row level security; alter table public.historico_propostas enable row level security;
alter table public.email_processamentos enable row level security; alter table public.email_outbox enable row level security;

do $$ declare t text; begin foreach t in array array['clientes','vendedores','produtos','metas','import_batches','import_conflitos','propostas','historico_propostas','email_processamentos','email_outbox'] loop
  execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=owner_id)',t||'_select_owner',t);
end loop; end $$;
do $$ declare t text; begin foreach t in array array['clientes','vendedores','produtos','metas','propostas'] loop
  execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid())=owner_id)',t||'_insert_owner',t);
  execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',t||'_update_owner',t);
end loop; end $$;
create policy aprovacoes_select_owner on public.aprovacoes for select to authenticated using ((select auth.uid())=owner_id);
create policy aprovacoes_insert_authorized on public.aprovacoes for insert to authenticated with check ((select auth.uid())=owner_id and coalesce((select auth.jwt())->'app_metadata'->>'crm_role','') in ('gerente','administrador'));
create policy aprovacoes_update_authorized on public.aprovacoes for update to authenticated using ((select auth.uid())=owner_id and coalesce((select auth.jwt())->'app_metadata'->>'crm_role','') in ('gerente','administrador')) with check ((select auth.uid())=owner_id and coalesce((select auth.jwt())->'app_metadata'->>'crm_role','') in ('gerente','administrador'));

revoke all on all tables in schema public from anon;
grant select on public.clientes,public.vendedores,public.produtos,public.metas,public.import_batches,public.import_conflitos,public.propostas,public.historico_propostas,public.email_processamentos,public.email_outbox,public.aprovacoes,public.propostas_detalhadas to authenticated;
grant insert,update on public.clientes,public.vendedores,public.produtos,public.metas,public.propostas to authenticated;
revoke all on function public.registrar_ganho(text,integer,uuid) from public,anon;
grant execute on function public.registrar_ganho(text,integer,uuid) to authenticated;

-- A implementação privilegiada fica fora dos schemas expostos. O wrapper público
-- é SECURITY INVOKER e a função interna ainda revalida auth.uid() e app_metadata.
alter function public.registrar_ganho(text,integer,uuid) set schema private;
create or replace function public.registrar_ganho(p_proposta_id text, p_versao integer, p_processamento_id uuid default null)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.registrar_ganho(p_proposta_id, p_versao, p_processamento_id) $$;
revoke all on function private.registrar_ganho(text,integer,uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.registrar_ganho(text,integer,uuid) to authenticated;
revoke all on function public.registrar_ganho(text,integer,uuid) from public,anon;
grant execute on function public.registrar_ganho(text,integer,uuid) to authenticated;
