"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { propostaSchema } from "@/lib/rules";
import { createClient, isConfigured } from "@/lib/supabase/server";

export type FormState = { erro?: string; campos?: Record<string, string[]> };
export async function salvarProposta(_state: FormState, formData: FormData): Promise<FormState> {
  if (!isConfigured()) return { erro: "A prévia é somente leitura. Configure o Supabase para salvar." };
  const parsed = propostaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: "Revise os campos destacados.", campos: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims(); const owner = claims?.claims?.sub;
  if (!owner) return { erro: "Sessão inválida. Entre novamente." };
  const isEdit = formData.get("modo") === "editar";
  const commercial = { ...parsed.data, data_fechamento: parsed.data.etapa === "Perdido" ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()) : null };
  const payload = { ...commercial, owner_id: owner, versao: 1, vigente: true };
  const result = isEdit
    ? await supabase.from("propostas").update(commercial).eq("proposta_id", parsed.data.proposta_id).eq("vigente", true)
    : await supabase.from("propostas").insert(payload);
  if (result.error) return { erro: result.error.message };
  revalidatePath("/propostas"); redirect(`/propostas/${parsed.data.proposta_id}`);
}
