export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const numero = new Intl.NumberFormat("pt-BR");
export const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export function dataBR(value?: string | null) {
  if (!value) return "—";
  const [ano, mes, dia] = value.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
