import type { ReactNode } from "react";
export function Kpi({ label, value, note }: { label: string; value: ReactNode; note?: string }) { return <article className="kpi"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>; }
